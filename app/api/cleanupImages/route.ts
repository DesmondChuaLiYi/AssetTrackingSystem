import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest) {
  try {
    // Machine-to-machine authentication (Cron Secret) instead of cookies
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 365);

    const { data: oldRecords, error: fetchError } = await supabaseAdmin
      .from('Maintenance')
      .select('id, image_url')
      .in('approval_status', ['approved', 'rejected'])
      .lt('actioned_at', thirtyDaysAgo.toISOString());

    if (fetchError) throw fetchError;
    if (!oldRecords || oldRecords.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const filePaths = oldRecords
      .map((r: any) => r.image_url?.split('/storage/v1/object/public/AssetImage/')[1])
      .filter(Boolean) as string[];

    if (filePaths.length > 0) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from('AssetImage')
        .remove(filePaths);
      if (deleteError) throw deleteError;
    }

    const ids = oldRecords.map((r: any) => r.id);
    await supabaseAdmin
      .from('Maintenance')
      .update({ image_url: null } as any)
      .in('id', ids);

    return NextResponse.json({ success: true, deleted: filePaths.length });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}