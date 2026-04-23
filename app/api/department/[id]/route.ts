import { NextRequest, NextResponse } from 'next/server';
// Import centralized admin client to safely bypass RLS on the server
import { supabaseAdmin } from '@/lib/supabase/server';
// Import shared session validator to ensure DRY principles
import { validateSession } from '@/lib/apiAuth';
// Import Zod for payload validation and injection protection
import { z } from 'zod';

// FIX APPLIED: Aligned with VARCHAR(30) from the database schema
const idSchema = z.string().min(1, 'Department ID is required').max(30, 'Department ID is too long');

// FIX APPLIED: Aligned strictly with the SUPABASE TABLES.txt schema.
// Removed 'description' (does not exist in DB) and updated max lengths.
const putSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  block: z.string().max(10).optional().nullable(),
  level: z.number().int().optional().nullable(),
}).strict(); 

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Standard authentication check - requires any valid logged-in user
  const authResult = await validateSession();
  if (!authResult.authorized) return authResult.response;

  try {
    const { id } = await params;
    const validatedId = idSchema.parse(id); // Validate the string ID from the URL

    const { data, error } = await supabaseAdmin
      .from('Department')
      .select('*')
      .eq('department_id', validatedId)
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    // Safe logging: records the message without exposing full DB error object details
    console.error('GET /api/department/[id] error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // RBAC implementation: Requires explicitly admin-level privileges to update records
  const authResult = await validateSession('admin'); 
  if (!authResult.authorized) return authResult.response;

  try {
    const { id } = await params;
    const validatedId = idSchema.parse(id); // Validate the string ID from the URL
    
    const body = await request.json();
    const validatedData = putSchema.parse(body); // Validate the JSON body

    // Stop early if the user sent an empty payload or only invalid fields that got stripped
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Execute the secure update using the admin client
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