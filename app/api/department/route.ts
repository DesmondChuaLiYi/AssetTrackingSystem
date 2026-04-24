// Commented on 23/04/2026 Daryl. Removed .strict() and changed level to z.coerce.number()
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';
import { z } from 'zod';

const getQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(''),
  searchField: z.enum(['name', 'department_id']).default('name'),
  sortBy: z.enum(['created_dt', 'name', 'department_id']).default('created_dt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// BUGFIX: Removed .strict() so it ignores extra hidden fields sent by the frontend form.
// BUGFIX: Changed level to z.coerce.number() to safely convert HTML string inputs into numbers.
const postSchema = z.object({
  department_id: z.string().min(1, 'Department ID is required').max(30),
  name: z.string().min(1, 'Department name is required').max(60),
  block: z.string().max(10).optional().nullable(),
  level: z.coerce.number().int().optional().nullable(),
}); 

const deleteSchema = z.object({
  department_id: z.string().min(1, 'Invalid Department ID').max(30),
});

export async function GET(request: NextRequest) {
  const authResult = await validateSession();
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = getQuerySchema.parse(queryParams);

    let query = supabaseAdmin.from('Department').select('*', { count: 'exact' });

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
  } catch (error: any) {
    console.error('GET /api/department error:', { message: error?.message }); 
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
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

    return NextResponse.json({ success: true, data: data });
  } catch (error: any) {
    console.error('POST /api/department error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create department', success: false }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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