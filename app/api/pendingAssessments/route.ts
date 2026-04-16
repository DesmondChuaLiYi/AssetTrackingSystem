import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  // RBAC: Only admins can fetch the pending review queue
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);

    // ── Pagination params (mirrors assets route.ts) ───────────────────────────
    const page  = Math.max(parseInt(searchParams.get('page')  || '1'),  1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    // ── Tab / filter params ───────────────────────────────────────────────────
    const status    = searchParams.get('status')    || 'pending';   // pending | approved | rejected
    const assetId   = (searchParams.get('asset_id') || '').slice(0, 50);
    const location  = (searchParams.get('location') || '').slice(0, 100);
    const condition = (searchParams.get('condition')|| '');

    // Whitelist allowed status values to prevent bad queries
    const allowedStatuses = ['pending', 'approved', 'rejected'];
    const safeStatus = allowedStatuses.includes(status) ? status : 'pending';

    // Whitelist allowed condition values
    const allowedConditions = ['In-use', 'In-store', 'Spoiled'];
    const safeCondition = allowedConditions.includes(condition) ? (condition as 'In-use' | 'In-store' | 'Spoiled') : null;

    // ── Helper: build a base query with common filters applied ───────────────
    const buildBase = (forStatus: 'pending' | 'approved' | 'rejected') => {
      let q = supabaseAdmin
        .from('Maintenance')
        .select('*', { count: 'exact' })
        .eq('maintenance_needed', true)
        .eq('approval_status', forStatus);

      if (assetId)   q = q.ilike('asset_id',    `%${assetId}%`);
      if (location)  q = q.ilike('location_id', `%${location}%`);
      if (safeCondition) q = q.eq('condition_status', safeCondition);

      return q;
    };

    // ── Run 4 queries in parallel ─────────────────────────────────────────────
    // 1. Current page data for the active tab
    // 2-4. Unfiltered counts for each tab badge
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const [pageResult, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      buildBase(safeStatus as 'pending' | 'approved' | 'rejected').order('assessed_dt', { ascending: false }).range(from, to),

      supabaseAdmin
        .from('Maintenance')
        .select('*', { count: 'exact', head: true })
        .eq('maintenance_needed', true)
        .eq('approval_status', 'pending'),

      supabaseAdmin
        .from('Maintenance')
        .select('*', { count: 'exact', head: true })
        .eq('maintenance_needed', true)
        .eq('approval_status', 'approved'),

      supabaseAdmin
        .from('Maintenance')
        .select('*', { count: 'exact', head: true })
        .eq('maintenance_needed', true)
        .eq('approval_status', 'rejected'),
    ]);

    if (pageResult.error) throw pageResult.error;

    const totalItems = pageResult.count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      assessments: pageResult.data ?? [],
      totalItems,
      totalPages,
      tabCounts: {
        pending:  pendingCount.count  ?? 0,
        approved: approvedCount.count ?? 0,
        rejected: rejectedCount.count ?? 0,
      },
    });

  } catch (error: any) {
    console.error('Pending assessments fetch error:', { message: error?.message });
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}