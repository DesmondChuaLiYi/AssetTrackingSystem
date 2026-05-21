/** Commented by Desmond @ 20-May-2026
 * This is a React Server Component — no 'use client' here.
 *
 * Why split from DashboardClient.tsx?
 * - AssetChartLoader uses supabaseAdmin (server.ts / service role key)
 * - If this page had 'use client', Next.js would bundle server.ts into
 *   the browser, exposing the service role key and throwing an env error
 * - By keeping page.tsx as a Server Component, AssetChartLoader runs
 *   only on the server and its data is passed to the client as rendered JSX
 *
 * The entityView selector in DashboardClient changes the URL search param,
 * which causes Next.js to re-render this Server Component with the new value,
 * re-fetching the chart data server-side with the correct entityView.
 */

import AssetChartLoader from './assetChartLoader'
import DashboardClient from './dashboardClient'

type EntityView = 'assets' | 'department' | 'location'

const CHART_CONFIG = {
  tableName: 'Asset',
  title: 'Total Assets',
  valueKey: 'count',
  labelKey: 'category',
  chartType: 'line' as const,
  color: '#3b82f6',
  limit: 200,
  dateKey: 'created_dt'
}

// searchParams lets us read the entityView from the URL (?entityView=department)
// so the server knows which view to pass to AssetChartLoader
interface DashboardPageProps {
  searchParams: Promise<{ entityView?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const entityView = (['assets', 'department', 'location'].includes(params.entityView || '')
    ? params.entityView
    : 'assets') as EntityView

  return (
    <DashboardClient
      entityView={entityView}
      chart={
        <AssetChartLoader
          config={CHART_CONFIG}
          entityView={entityView}
        />
      }
    />
  )
}
