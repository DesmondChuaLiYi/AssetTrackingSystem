import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const querySchema = z.object({
  tableName: z.string().min(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
});

async function authenticateUser() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(name: string) { return cookieStore.get(name)?.value; } },
    }
  );
  const { data: { session }, error } = await supabaseAuth.auth.getSession();
  if (error || !session) throw new Error('Unauthorized');
  return session.user;
}

export async function GET(request: NextRequest) {
  try {
    await authenticateUser();

    const { searchParams } = new URL(request.url);
    const validatedParams = querySchema.parse({
      tableName: searchParams.get('tableName'),
      limit: searchParams.get('limit'),
    });

    const { data, error } = await supabaseAdmin
      .from(validatedParams.tableName)
      .select('*')
      .order('created_dt', { ascending: true }) // Adjust to 'created_at' if your tables use that
      .limit(validatedParams.limit);

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
}