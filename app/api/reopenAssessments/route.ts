import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { assessmentId } = await request.json();

    if (!assessmentId) {
      return NextResponse.json({ success: false, error: 'Missing assessmentId' }, { status: 400 });
    }

    // Reset approval_status back to pending, clear actioned_at
    const { error } = await supabaseAdmin
      .from('Maintenance')             
      .update({
        approval_status: 'pending',
        actioned_at: null,
      })
      .eq('id', assessmentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reopen error:', error);
    return NextResponse.json({ success: false, error: 'Failed to reopen' }, { status: 500 });
  }
}