import { NextRequest, NextResponse } from 'next/server';
// Import centralized admin client to safely bypass RLS on the server
import { supabaseAdmin } from '@/lib/supabase/server';
// Import shared session validator to ensure DRY principles
import { validateSession } from '@/lib/apiAuth';
// Import Zod for payload validation and injection protection
import { z } from 'zod';

// Ensure the ID provided in the URL is a valid UUID format
// Commented by Desmond @ 23-April-26 : No, this isn't supposed to be UUID (for both Location and Department's API route), this will need to be changed
// TODO: Fix location and department's /[id]/route.ts so that you can properly view, add, update and delete the location and department records
const idSchema = z.string().min(1).max(30);

// .strict() prevents mass assignment by dropping any fields not explicitly defined here
const putSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional(),
  block: z.string().max(50).optional().nullable(),
  level: z.number().optional().nullable(),
}).strict();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check that the user has a valid session before fetching
  const authResult = await validateSession();
  if (!authResult.authorized) return authResult.response;

  try {
    const { id } = await params;
    const validatedId = idSchema.parse(id);

    const { data, error } = await supabaseAdmin
      .from('Location')
      .select('*')
      .eq('location_id', validatedId)
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    // Safe server logging
    console.error('GET /api/location/[id] error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Requires admin privileges to update a location
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const { id } = await params;
    const validatedId = idSchema.parse(id);
    
    const body = await request.json();
    const validatedData = putSchema.parse(body);

    // Stop early if there is no valid data to update
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('Location')
      .update({ ...validatedData, updated_dt: new Date().toISOString() })
      .eq('location_id', validatedId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('PUT /api/location/[id] error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}