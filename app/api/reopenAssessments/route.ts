import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';
import { z } from 'zod';

const payloadSchema = z.object({
  assessmentId: z.string().uuid('Invalid Assessment ID'),
}).strict();

export async function POST(request: NextRequest) {
  // RBAC: Only admins can reopen assessments
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const { assessmentId } = payloadSchema.parse(body);

    if (!assessmentId) {
      return NextResponse.json({ success: false, error: 'Missing assessmentId' }, { status: 400 });
    }

    // Reset approval_status back to pending, clear actioned_dt, so if the admin wants accidentally approved/rejected, 
    // they can reopen it and it will be treated as pending again (WC)
    const { error } = await supabaseAdmin
      .from('Maintenance')
      .update({
        approval_status: 'pending',
        actioned_at: null,
      })
      .eq('id', assessmentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reopen error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to reopen' }, { status: 500 });
  }
}