import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { assessmentId } = await request.json();

    if (!assessmentId) {
      return NextResponse.json({ success: false, error: 'Missing assessmentId' }, { status: 400 });
    }

    // Update approval_status to rejected + save timestamp
    // Image is kept for 30 days (cleaned up by scheduled job)
    const { error } = await supabaseAdmin
      .from('Maintenance')             
      .update({
        approval_status: 'rejected',
        actioned_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reject error:', error);
    return NextResponse.json({ success: false, error: 'Failed to reject' }, { status: 500 });
  }
}