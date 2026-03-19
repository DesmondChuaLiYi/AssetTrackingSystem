import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const payloadSchema = z.object({
  assessmentId: z.string().uuid('Invalid Assessment ID'),
});

async function authenticateUser(requireAdmin = true) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name: string) { return cookieStore.get(name)?.value; } },
  });
  const { data: { session }, error } = await supabaseAuth.auth.getSession();
  if (error || !session) throw new Error('Unauthorized');
  
  if (requireAdmin && session.user.user_metadata?.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return session.user;
}

export async function POST(request: NextRequest) {
  try {
    await authenticateUser(true);
    
    const body = await request.json();
    const validatedData = payloadSchema.parse(body);

    const { error } = await supabaseAdmin
      .from('Maintenance')
      .update({
        approval_status: 'pending',
        actioned_at: null,
      })
      .eq('id', validatedData.assessmentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.startsWith('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: 'Failed to reopen' }, { status: 500 });
  }
}