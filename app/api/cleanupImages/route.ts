import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all actioned records older than 365 days/ 1 year (WC)
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

    // Extract file paths from image URLs in supabase (WC)
    const filePaths = oldRecords
      .map((r: any) => r.image_url?.split('/storage/v1/object/public/AssetImage/')[1]) 
      .filter(Boolean) as string[];

    // Delete images from Supabase bucket (WC)
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from('AssetImage')
        .remove(filePaths);

      if (deleteError) throw deleteError;
    }

    // Clear image column from database records (WC)
    const ids = oldRecords.map((r: any) => r.id);
    await supabaseAdmin
      .from('Maintenance')            
      .update({ image_url: null } as any) 
      .in('id', ids);

    console.log(`Cleanup: deleted ${filePaths.length} images`);
    return NextResponse.json({ success: true, deleted: filePaths.length });

  } catch (error: any) {
    console.error('Cleanup error:', { message: error?.message });
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}