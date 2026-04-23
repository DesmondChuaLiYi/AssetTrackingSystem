import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';
import { z } from 'zod';

const payloadSchema = z.object({
  assessmentId: z.string().uuid('Invalid Assessment ID'),
}).strict();

export async function POST(request: NextRequest) {
  // RBAC: Only admins can reject assessments
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const { assessmentId } = payloadSchema.parse(body);

    if (!assessmentId) {
      return NextResponse.json({ success: false, error: 'Missing assessmentId' }, { status: 400 });
    }

    // Update approval_status to rejected and save timestamp (WC)
    // Image is kept for 30 days (should be kept for 1 year actually, will update in the next iteration)
    const { error } = await supabaseAdmin
      .from('Maintenance')
      .update({
        approval_status: 'rejected',
        actioned_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reject error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to reject' }, { status: 500 });
  }
}