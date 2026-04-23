import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';
import { z } from 'zod';

const getQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(''),
  searchField: z.enum(['name', 'location_id']).default('name'),
  sortBy: z.enum(['created_dt', 'name', 'location_id']).default('created_dt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// BUGFIX: Added location_id so users can input custom IDs. 
// Aligned max lengths (name: 30, description: 30, block: 10) to exactly match SUPABASE TABLES.txt
const postSchema = z.object({
  location_id: z.string().min(1, 'Location ID is required').max(30),
  name: z.string().min(1, 'Location name is required').max(30),
  description: z.string().max(30).optional().nullable(),
  block: z.string().max(10).optional().nullable(),
  level: z.number().int().optional().nullable(),
}).strict();

// BUGFIX: Removed .uuid() requirement to support VARCHAR primary keys
const deleteSchema = z.object({
  location_id: z.string().min(1, 'Invalid Location ID').max(30),
});

export async function GET(request: NextRequest) {
  // Check that the user has a valid session to view locations
  const authResult = await validateSession();
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const validatedParams = getQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    let query = supabaseAdmin
      .from('Location')
      .select('*', { count: 'exact' })

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
    console.error('GET /api/location error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Admin-only action to create a new location
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const validatedData = postSchema.parse(body);

    // BUGFIX: Removed crypto.randomUUID(). The location_id is now retrieved from validatedData.

    const { data, error } = await supabaseAdmin.from('Location')
      .insert([{ 
        ...validatedData, // Safely spreads location_id, name, description, block, and level
        created_dt: new Date().toISOString(), 
        updated_dt: new Date().toISOString() 
      }])
      .select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/location error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Admin-only action to delete a location
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const validatedData = deleteSchema.parse({ location_id: searchParams.get('location_id') });

    const { error } = await supabaseAdmin.from('Location').delete().eq('location_id', validatedData.location_id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Location deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/location error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}

