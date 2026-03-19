import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// This route is called by a cron job every day
// Set it up in vercel.json:
// {
//   "crons": [{ "path": "/api/cleanupImages", "schedule": "0 2 * * *" }]
// }

export async function GET(request: NextRequest) {
  try {
    // Only allow calls from Vercel cron or your own server (basic protection)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all actioned records older than 365 days/ 1 year
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 365);

    const { data: oldRecords, error: fetchError } = await supabaseAdmin
      .from('Maintenance')             
      .select('id, image_url')      
      .in('approval_status', ['approved', 'rejected'])
      .lt('actioned_at', thirtyDaysAgo.toISOString())

    if (fetchError) throw fetchError;
    if (!oldRecords || oldRecords.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Extract file paths from image URLs
    const filePaths = oldRecords
      .map((r: any) => r.image_url?.split('/storage/v1/object/public/AssetImage/')[1]) 
      .filter(Boolean) as string[];

    // Delete images from Supabase bucket
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from('AssetImage') // 
        .remove(filePaths);

      if (deleteError) throw deleteError;
    }

    // Clear image column from database records
    const ids = oldRecords.map((r: any) => r.id);
    await supabaseAdmin
      .from('Maintenance')            
      .update({ image_url: null } as any) 
      .in('id', ids);

    console.log(`Cleanup: deleted ${filePaths.length} images`);
    return NextResponse.json({ success: true, deleted: filePaths.length });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}