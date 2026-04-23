import { NextRequest, NextResponse } from 'next/server';
// Import centralized admin client to safely bypass RLS on the server
import { supabaseAdmin } from '@/lib/supabase/server';
// Import shared session validator to ensure DRY principles
import { validateSession } from '@/lib/apiAuth';
// Import Zod for payload validation and injection protection
import { z } from 'zod';

// Define the schema for GET query parameters with defaults
const getQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(''),
  searchField: z.enum(['name', 'department_id']).default('name'),
  sortBy: z.enum(['created_dt', 'name', 'department_id']).default('created_dt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// BUGFIX: Modified postSchema to accept custom department_id from the user/scanner.
// Removed 'description' since it doesn't exist in the Department table in Supabase.
// Aligned character lengths to match VARCHAR limits in Supabase.
const postSchema = z.object({
  department_id: z.string().min(1, 'Department ID is required').max(30),
  name: z.string().min(1, 'Department name is required').max(60),
  block: z.string().max(10).optional().nullable(),
  level: z.number().int().optional().nullable(),
}).strict();

// BUGFIX: Changed from .uuid() to standard string validation to support VARCHAR primary keys like "IT-01"
const deleteSchema = z.object({
  department_id: z.string().min(1, 'Invalid Department ID').max(30),
});

export async function GET(request: NextRequest) {
  // Standard authentication check - requires any valid logged-in user session
  const authResult = await validateSession();
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = getQuerySchema.parse(queryParams); // Parse & whitelist params

    // Initialize query using the secure admin client
    let query = supabaseAdmin
      .from('Department')
      .select('*', { count: 'exact' });

    // Apply search filter if a search term was provided
    if (validatedParams.search) {
      query = query.ilike(validatedParams.searchField, `%${validatedParams.search}%`);
    }

    // Apply sorting
    query = query.order(validatedParams.sortBy, { ascending: validatedParams.sortOrder === 'asc' });

    // Calculate pagination ranges
    const from = (validatedParams.page - 1) * validatedParams.limit;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / validatedParams.limit)
    });
  } catch (error: any) {
    console.error('GET /api/department error:', { message: error?.message }); // Safe logging
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // RBAC: Only admins can create new departments
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const validatedData = postSchema.parse(body); // Validate and sanitize incoming data

    // BUGFIX: Removed crypto.randomUUID(). The department_id is now passed dynamically from validatedData.
    
    // Execute database insert
    const { data, error } = await supabaseAdmin
      .from('Department')
      .insert([{
        ...validatedData, // This safely spreads the custom department_id, name, block, and level
        created_dt: new Date().toISOString(),
        updated_dt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error: any) {
    // BUGFIX: Improved error logging to use safe message extraction
    console.error('POST /api/department error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create department',
        success: false
      },
      { status: 500 }
    )
  }
}

// BUGFIX: This PUT method was acting like a GET request and lacked auth. 
// Standardized it as a fallback placeholder or you can remove it if PUT is handled in [id]/route.ts
export async function PUT() {
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const { data, error } = await supabaseAdmin
      .from('Department')
      .select('*')
      .order('department_id', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      data: data || []
    })
  } catch (error: any) {
    console.error('GET /api/departments error:', { message: error?.message });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch departments',
        details: error
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // RBAC: Only admins can delete departments
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const validatedData = deleteSchema.parse({
      department_id: searchParams.get('department_id')
    });

    const { error } = await supabaseAdmin
      .from('Department')
      .delete()
      .eq('department_id', validatedData.department_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Department deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/department error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}