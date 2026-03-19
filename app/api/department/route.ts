import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Initialize Supabase Admin client for bypassed RLS operations FIXED
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Zod Schemas for Validation and Whitelisting ---

const getQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(''),
  // Whitelist allowable search and sort fields to prevent SQL injection/errors
  searchField: z.enum(['name', 'department_id']).default('name'),
  sortBy: z.enum(['created_dt', 'name', 'department_id']).default('created_dt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const postSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
  description: z.string().max(255).optional(),
});

const putSchema = z.object({
  department_id: z.string().uuid('Invalid Department ID'),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional(),
});

const deleteSchema = z.object({
  department_id: z.string().uuid('Invalid Department ID'),
});

// --- Helper: Auth Check ---

async function authenticateUser() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { session }, error } = await supabaseAuth.auth.getSession();
  
  if (error || !session) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

// --- Route Handlers ---

export async function GET(request: NextRequest) {
  try {
    await authenticateUser();

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate and whitelist parameters
    const validatedParams = getQuerySchema.parse(queryParams);

    let query = supabaseAdmin
      .from('Department')
      .select('*', { count: 'exact' });

    if (validatedParams.search) {
      query = query.ilike(validatedParams.searchField, `%${validatedParams.search}%`);
    }

    query = query.order(validatedParams.sortBy, { ascending: validatedParams.sortOrder === 'asc' });

    const from = (validatedParams.page - 1) * validatedParams.limit;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / validatedParams.limit)
    });
  } catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
}
}

export async function POST(request: NextRequest) {
  try {
    await authenticateUser();

    const body = await request.json();
    
    // Validate and whitelist body payload
    const validatedData = postSchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from('Department')
      .insert([{
        ...validatedData,
        created_dt: new Date().toISOString(),
        updated_dt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
}
}

export async function PUT(request: NextRequest) {
  try {
    await authenticateUser();

    const body = await request.json();
    
    // Validate and whitelist body payload
    const validatedData = putSchema.parse(body);
    const { department_id, ...updateFields } = validatedData;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No data provided to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('Department')
      .update({
        ...updateFields,
        updated_dt: new Date().toISOString()
      })
      .eq('department_id', department_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
}
}

export async function DELETE(request: NextRequest) {
  try {
    await authenticateUser();

    const { searchParams } = new URL(request.url);
    
    // Validate query parameter
    const validatedData = deleteSchema.parse({
      department_id: searchParams.get('department_id')
    });

    const { error } = await supabaseAdmin
      .from('Department')
      .delete()
      .eq('department_id', validatedData.department_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
}
}