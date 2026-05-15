// Commented on 23/04/2026 Daryl. Removed .strict() and used coerce.number()
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';
import { z } from 'zod';

const idSchema = z.string().min(1, 'Location ID is required').max(30, 'Location ID is too long');

// BUGFIX: Removed .strict() and used coerce.number()
const putSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  // Commented on 26/04/2026 Daryl. Updated max length to 200 to match DB schema change
  description: z.string().max(200).optional().nullable(),
  block: z.string().max(10).optional().nullable(),
  level: z.coerce.number().int().optional().nullable(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    console.error('GET /api/location/[id] error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const { id } = await params;
    const validatedId = idSchema.parse(id);
    
    const body = await request.json();
    const validatedData = putSchema.parse(body);

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