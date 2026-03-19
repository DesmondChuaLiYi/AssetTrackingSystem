import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const idSchema = z.string().uuid('Invalid Location ID');

const putSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional(),
});

async function authenticateUser() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name: string) { return cookieStore.get(name)?.value; } },
  });
  const { data: { session }, error } = await supabaseAuth.auth.getSession();
  if (error || !session) throw new Error('Unauthorized');
  return session.user;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authenticateUser();
    const { id } = await params;
    const validatedId = idSchema.parse(id);

    const { data, error } = await supabaseAdmin.from('Location').select('*').eq('location_id', validatedId).single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authenticateUser();
    const { id } = await params;
    const validatedId = idSchema.parse(id);
    
    const body = await request.json();
    const validatedData = putSchema.parse(body);

    const { data, error } = await supabaseAdmin.from('Location')
      .update({ ...validatedData, updated_dt: new Date().toISOString() })
      .eq('location_id', validatedId).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}