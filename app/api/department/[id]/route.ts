// Commented on 23/04/2026 Daryl. Removed .strict() 
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';
import { z } from 'zod';

const idSchema = z.string().min(1, 'Department ID is required').max(30, 'Department ID is too long');

// BUGFIX: Removed .strict() to allow the frontend to safely send the whole row (including created_dt, etc.) without crashing.
// Zod will now automatically strip the extra fields and only update what is defined below.
const putSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  block: z.string().max(10).optional().nullable(),
  level: z.coerce.number().int().optional().nullable(),
}); 

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await validateSession();

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = idSchema.parse(id);

    const { data, error } = await supabaseAdmin
      .from('Department')
      .select('*')
      .eq('department_id', validatedId)
      .single();

    if (error) { 
      throw error;
    }

    return NextResponse.json(
      { success: true, data }
    );
  } catch (error: any) {
    console.error('GET /api/department/[id] error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await validateSession('admin'); 

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const validatedId = idSchema.parse(id);
    
    const body = await request.json();
    const validatedData = putSchema.parse(body);

    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('Department')
      .update({ ...validatedData, updated_dt: new Date().toISOString() })
      .eq('department_id', validatedId)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('PUT /api/department/[id] error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}