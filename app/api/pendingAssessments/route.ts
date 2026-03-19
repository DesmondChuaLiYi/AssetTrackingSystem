import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

export async function GET() {
  try {
    await authenticateUser(true);

    const { data, error } = await supabaseAdmin
      .from('Maintenance')
      .select('*')
      .eq('maintenance_needed', true)
      .order('assessed_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, assessments: data ?? [] });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.startsWith('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}