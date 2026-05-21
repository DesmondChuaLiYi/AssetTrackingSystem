// app/dashboard/AssetChartLoader.tsx
/** Commented by Desmond @ 20-May-2026
 * This is a React Server Component — it runs only on the server.
 * It fetches asset, department, and location data using supabaseAdmin
 * (service role key) which bypasses RLS, then passes the data as props
 * to the RealtimeChart client component.
 *
 * Why server-side?
 * - The Asset table has a DENY policy for the 'anon' role (using false),
 *   so the anon key in client.ts returns empty data silently.
 * - The service role key in server.ts must never be used client-side.
 * - This pattern fetches data securely on the server, renders instantly
 *   with the page, and lets the client component handle realtime updates.
 *
 * Never add 'use client' to this file.
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import RealtimeChart from '@/components/charts/realtimeChart'

// Re-use the same ChartConfig type from realtimeChart.tsx
interface ChartConfig {
  tableName: string
  title: string
  valueKey: string
  labelKey?: string
  chartType?: 'line' | 'bar' | 'combo'
  color?: string
  limit?: number
  dateKey?: string
}

// Fetch all assets with joins, paginated to handle large datasets
async function fetchAllAssets(): Promise<any[]> {
  const PAGE_LIMIT = 50
  let from = 0
  const results: any[] = []

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('Asset')
      .select(`
        *,
        location:location_id(name, description),
        department:department_id(name)
      `)
      .is('deleted_dt', null)                          // Exclude soft-deleted records
      .order('created_dt', { ascending: true })
      .range(from, from + PAGE_LIMIT - 1)

    if (error) throw new Error(`Asset fetch error: ${error.message}`)
    if (!data || data.length === 0) break
    results.push(...data)
    if (data.length < PAGE_LIMIT) break               // Last page reached
    from += PAGE_LIMIT
  }

  return results
}

// Fetch all active departments (only the fields needed for the chart)
async function fetchAllDepartments(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('Department')
    .select('department_id, name')
    .is('deleted_dt', null)

  if (error) throw new Error(`Department fetch error: ${error.message}`)
  return data || []
}

// Fetch all active locations (only the fields needed for the chart)
async function fetchAllLocations(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('Location')
    .select('location_id, name')
    .is('deleted_dt', null)

  if (error) throw new Error(`Location fetch error: ${error.message}`)
  return data || []
}

interface AssetChartLoaderProps {
  config: ChartConfig
  entityView?: 'assets' | 'department' | 'location'
}

export default async function AssetChartLoader({ config, entityView }: AssetChartLoaderProps) {
  // Fetch all three in parallel so we don't waterfall the requests
  const [assets, depts, locs] = await Promise.all([
    fetchAllAssets(),
    fetchAllDepartments(),
    fetchAllLocations(),
  ])

  return (
    <RealtimeChart
      config={config}
      entityView={entityView}
      initialAssets={assets}
      initialDepts={depts}
      initialLocs={locs}
    />
  )
}
