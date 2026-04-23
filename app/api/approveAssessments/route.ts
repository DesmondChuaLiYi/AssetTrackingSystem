import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';
import { z } from 'zod';

const payloadSchema = z.object({
  assessmentId: z.string().uuid('Invalid Assessment ID'),
}).strict();

export async function POST(request: NextRequest) {
  // RBAC: Only admins can approve assessments
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const { assessmentId } = payloadSchema.parse(body);

    if (!assessmentId) {
      return NextResponse.json({ success: false, error: 'Missing assessmentId' }, { status: 400 });
    }

    // Update the approval_status to approved and save the timestamp (WC)
    // Image is kept for 30 days (need to change to 1 year actually)
    const { error } = await supabaseAdmin
      .from('Maintenance')
      .update({
        approval_status: 'approved',
        actioned_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Approve error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to approve' }, { status: 500 });
  }
}