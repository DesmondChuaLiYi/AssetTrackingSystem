'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CONDITIONS = ['In-use', 'In-store', 'Spoiled'] as const;
type Condition = typeof CONDITIONS[number];

const CONDITION_COLORS: Record<Condition, string> = {
  'In-use':  '#3b82f6',
  'In-store': '#22c55e',
  'Spoiled': '#ef4444',
};

// const CONDITION_COLORS_ALPHA: Record<Condition, string> = {
//   'In-use': 'rgba(59,130,246,0.15)',
//   'In-store': 'rgba(34,197,94,0.15)',
//   'Spoiled': 'rgba(239,68,68,0.15)',
// };

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Types and interfaces
interface ChartConfig {
  tableName: string;
  title: string;
  valueKey: string;
  labelKey?: string;
  chartType?: 'line' | 'bar' | 'combo';
  color?: string;
  limit?: number;
  dateKey?: string;
}

type DateRange = 'quarter' | 'year';
type ViewMode = 'bar' | 'trend';
type EntityView = 'assets' | 'department' | 'location';

interface ChartExternalControls {
  entityView: EntityView;
}

// Label month names and sorting keys for monthly grouping
const getMonthLabel = (ds: string) => { const d = new Date(ds); return isNaN(d.getTime()) ? ds : MONTH_NAMES[d.getMonth()]; };
const getMonthSortKey = (ds: string) => { const d = new Date(ds); return isNaN(d.getTime()) ? ds : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

// Derive fiscal quarter and year from a date (assuming Q1=Mar-May, Q2=Jun-Aug, Q3=Sep-Nov, Q4=Dec-Feb)
const getSeasonalQuarter = (date: Date) => {
  const m = date.getMonth(), y = date.getFullYear();
  if (m >= 2 && m <= 4)  return { quarter: 1, year: y };
  if (m >= 5 && m <= 7)  return { quarter: 2, year: y };
  if (m >= 8 && m <= 10) return { quarter: 3, year: y };
  return { quarter: 4, year: (m === 0 || m === 1) ? y - 1 : y };
};

// Fetch all assets with pagination
async function fetchAllAssets(): Promise<any[]> {
  const PAGE_LIMIT = 50;
  let page = 1, totalPages = 1;
  const results: any[] = [];
  do {
    // Note: the API should ideally support filtering/sorting by created_dt for efficiency, 
    // but if not, we can fetch all and filter client-side
    const res = await fetch(`/api/assets?page=${page}&limit=${PAGE_LIMIT}&sortBy=created_dt&sortOrder=asc`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    results.push(...(json.data || []));
    totalPages = json.totalPages || 1;
    page++;
  } while (page <= totalPages);
  return results;
}

// Fetch all departments with pagination
async function fetchAllDepartments(): Promise<any[]> {
  // const PAGE_LIMIT = 100;
  let page = 1, totalPages = 1;
  const results: any[] = [];
  do {
    const res = await fetch(`/api/department`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    results.push(...(json.data || []));
    totalPages = json.totalPages || 1;
    page++;
  } while (page <= totalPages);
  return results;
}

// Fetch all locations with pagination
async function fetchAllLocations(): Promise<any[]> {
  // const PAGE_LIMIT = 100;
  let page = 1, totalPages = 1;
  const results: any[] = [];
  do {
    const res = await fetch(`/api/location`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    results.push(...(json.data || []));
    totalPages = json.totalPages || 1;
    page++;
  } while (page <= totalPages);
  return results;
}


/** Summary pill for each condition */
function ConditionPill({ condition, count }: { condition: Condition; count: number }) {
  const color = CONDITION_COLORS[condition];
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex flex-col gap-0.5">
        <span className="text-lg font-medium leading-none" style={{ color }}>{count}</span>
        <span className="text-xs text-gray-500">{condition}</span>
      </div>
    </div>
  );
}

/** Spoilage alert card for department or location */
function SpoilageAlert({ items, label }: { items: { name: string; count: number }[]; label: string }) {
  if (!items.length) return null;
  const top = items[0];
  const isHigh = top.count >= 5;
  const others = items.slice(1, 3).map(i => `${i.name} (${i.count})`).join(', ');

  return (
    <div
      className={`flex-1 min-w-[160px] p-3 rounded-xl border text-sm ${
        isHigh
          ? 'bg-red-50 border-red-300'
          : 'bg-amber-50 border-amber-300'
      }`}
    >
      <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${
        isHigh ? 'text-red-600' : 'text-amber-600'
      }`}>
        {label}
      </div>
      <div className="font-semibold text-gray-900 text-sm mb-0.5">{top.name}</div>
      <div className={`text-xs font-medium ${isHigh ? 'text-red-600' : 'text-amber-600'}`}>
        {top.count} spoiled asset{top.count !== 1 ? 's' : ''}
      </div>
      {others && (
        <div className="text-xs text-gray-500 mt-1.5">Also: {others}</div>
      )}
    </div>
  );
}

/** Custom recharts tooltip */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm min-w-[150px]">
      <div className="font-medium text-gray-700 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4 items-center py-0.5">
          <span className="font-medium" style={{ color: p.color || p.fill }}>{p.name}</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-2 pt-1.5 flex justify-between text-gray-500 font-medium">
        <span>Total</span>
        <span className="font-semibold text-gray-700">{total}</span>
      </div>
    </div>
  );
}

/** Tab button */
function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-xs rounded-md transition-all duration-150 ${
        active
          ? 'bg-white text-gray-900 font-medium shadow-sm border border-gray-200'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

// Main component
export default function RealtimeChart({
  config,
  entityView: entityViewProp,
}: { config: ChartConfig } & Partial<ChartExternalControls>) {
  const { tableName, title } = config;

  const [data, setData] = useState<any[]>([]);
  const [deptMap, setDeptMap] = useState<Record<string, string>>({});
  const [locMap, setLocMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, _setDateRange] = useState<DateRange>('year');
  const [selectedQuarter, _setSelectedQuarter] = useState('');
  const [selectedYear, _setSelectedYear] = useState(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [_entityView, _setEntityView] = useState<EntityView>('assets');

  // Use external entityView prop if provided, otherwise fall back to internal state
  const entityView = entityViewProp ?? _entityView;

  // Derive available quarters and years from the data for the dropdowns
  const availableOptions = (() => {
    const quarters = new Set<string>(), years = new Set<string>();
    data.forEach(item => {
      const ds = item.created_dt || item.created_at || item.updated_at;
      if (!ds) return;
      const d = new Date(ds);
      if (isNaN(d.getTime())) return;
      const { quarter, year } = getSeasonalQuarter(d);
      quarters.add(`${year}-Q${quarter}`);
      years.add(String(d.getFullYear()));
    });
    return { quarters: Array.from(quarters).sort().reverse(), years: Array.from(years).sort().reverse() };
  })();

  // On data load, if no quarter selected, default to current quarter if available
  useEffect(() => {
    if (availableOptions.quarters.length > 0 && !selectedQuarter) {
      const { quarter, year } = getSeasonalQuarter(new Date());
      _setSelectedQuarter(`${year}-Q${quarter}`);
    }
  }, [data]);

  // Fetch initial data and set up realtime updates
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch assets, departments, and locations in parallel for efficiency
        const [assets, depts, locs] = await Promise.all([
          fetchAllAssets(),
          fetchAllDepartments(),
          fetchAllLocations(),
        ]);
        // If the component was unmounted while fetching, don't attempt to update state
        if (!cancelled) {
          setData(assets);
          setDeptMap(Object.fromEntries(depts.map((d: any) => [d.department_id, d.name])));
          setLocMap(Object.fromEntries(locs.map((l: any) => [l.location_id, l.name])));
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Set up Supabase realtime subscription to the assets table
    const ch = supabase.channel(`${tableName}-chart`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, payload => {
        if (payload.eventType === 'INSERT' && !payload.new.deleted_dt)
          setData(cur => [...cur, payload.new]);
        else if (payload.eventType === 'UPDATE')
          setData(cur => payload.new.deleted_dt
            ? cur.filter(i => i.asset_id !== payload.new.asset_id)
            : cur.map(i => i.asset_id === payload.new.asset_id ? payload.new : i));
        else if (payload.eventType === 'DELETE')
          setData(cur => cur.filter(i => i.asset_id !== payload.old.asset_id));
      }).subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [tableName]);

  // Filter data based on selected date range and entity view
  const filteredData = data.filter(item => {
    const ds = item.created_dt || item.created_at || item.updated_at;
    if (!ds) return false;
    const d = new Date(ds);
    // If date is invalid, exclude from chart (could be included in totals/alerts if it has a valid condition, but this is a rare edge case)
    if (isNaN(d.getTime())) return false;
    // Apply date range filtering based on selected quarter or year
    if (dateRange === 'quarter' && selectedQuarter) {
      const [yearStr, qStr] = selectedQuarter.split('-Q');
      const q = parseInt(qStr), y = parseInt(yearStr);
      if (q === 1) return d.getFullYear() === y && d.getMonth() >= 2  && d.getMonth() <= 4;
      if (q === 2) return d.getFullYear() === y && d.getMonth() >= 5  && d.getMonth() <= 7;
      if (q === 3) return d.getFullYear() === y && d.getMonth() >= 8  && d.getMonth() <= 10;
      if (q === 4) return (
        (d.getFullYear() === y && d.getMonth() === 11) ||
        (d.getFullYear() === y + 1 && (d.getMonth() === 0 || d.getMonth() === 1))
      );
    }
    if (dateRange === 'year' && selectedYear)
      return d.getFullYear() === parseInt(selectedYear);
    return true;
  });

  // Helper to resolve department/location names from either ID or object, with fallback to 'Unknown'
  const resolveName = (raw: any, lookupMap: Record<string, string>): string => {
    if (raw == null) return 'Unknown';
    if (typeof raw === 'object') return raw.name || 'Unknown';
    const key = String(raw);
    return lookupMap[key] || key || 'Unknown';
  };

  // Group and aggregate data for the chart based on the current entity view
  const chartData = (() => {
    // Assets view: group by month, show condition breakdown
    if (entityView === 'assets') {
      const map: Record<string, { time: string; sortKey: string } & Record<Condition, number>> = {};
      filteredData.forEach(item => {
        const ds = item.created_dt || item.created_at || item.updated_at;
        if (!ds) return;
        const cond = item.condition as Condition;
        if (!CONDITIONS.includes(cond)) return;
        const sortKey = getMonthSortKey(ds);
        const month   = getMonthLabel(ds);
        if (!map[sortKey]) map[sortKey] = { time: month, sortKey, 'In-use': 0, 'In-store': 0, 'Spoiled': 0 };
        map[sortKey][cond]++;
      });
      return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }

    // Department or Location view: group by entity name, show condition breakdown
    const field = entityView === 'department' ? 'department_id' : 'location_id';
    const lookupMap = entityView === 'department' ? deptMap : locMap;
    const map: Record<string, { time: string; sortKey: string } & Record<Condition, number>> = {};
    filteredData.forEach(item => {
      // Resolve the entity name from either an ID or an embedded object, with fallback to 'Unknown'
      const cond = item.condition as Condition;
      if (!CONDITIONS.includes(cond)) return;
      const name = resolveName(item[field], lookupMap);
      if (name === 'Unknown') return;
      if (!map[name]) map[name] = { time: name, sortKey: name, 'In-use': 0, 'In-store': 0, 'Spoiled': 0 };
      map[name][cond]++;
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  })();

  // Totals for each condition across the filtered dataset, used for the summary pills
  const totals = CONDITIONS.reduce((acc, c) => {
    acc[c] = filteredData.filter(i => i.condition === c).length;
    return acc;
  }, {} as Record<Condition, number>);

  // For spoilage alerts, rank departments and locations by their count of spoiled assets
  const spoiledItems = filteredData.filter(i => i.condition === 'Spoiled');
  const rankBy = (field: string, lookupMap: Record<string, string>) => {
    const counts: Record<string, number> = {};
    spoiledItems.forEach(i => {
      const v = resolveName(i[field], lookupMap);
      if (v === 'Unknown') return;
      counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };

  // Get top spoiled departments and locations for the alerts section in the assets view
  const spoiledByDept = rankBy('department_id', deptMap);
  const spoiledByLocation = rankBy('location_id', locMap);

  // In department or location views, derive per-entity condition breakdown for the alert
    const entityConditionSummary = (() => {
      if (entityView === 'assets') return null;
    const field = entityView === 'department' ? 'department_id' : 'location_id';
    const lookupMap = entityView === 'department' ? deptMap : locMap;
    const map: Record<string, Record<Condition, number> & { total: number }> = {};
    filteredData.forEach(item => {
      const cond = item.condition as Condition;
      if (!CONDITIONS.includes(cond)) return;
      const name = resolveName(item[field], lookupMap);
      if (name === 'Unknown') return;
      if (!map[name]) map[name] = { 'In-use': 0, 'In-store': 0, 'Spoiled': 0, total: 0 };
      map[name][cond]++;
      map[name].total++;
    });
    // Return sorted by spoiled count desc, then total desc
    return Object.entries(map)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.Spoiled - a.Spoiled || b.total - a.total);
  })();

  // Determine the most recent update timestamp from the data for display in the footer
  const lastItem = data[data.length - 1];
  const lastDs = lastItem?.created_dt || lastItem?.updated_at;
  const lastDate = lastDs ? new Date(lastDs) : null;

  // Render loading and error states
  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-gray-400">
      Loading {title}…
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-red-400">
      Error: {error}
    </div>
  );

  // CSS class for the select dropdowns, defined here to avoid repetition
  const selectCls = 'px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-700 focus:border-blue-400 outline-none cursor-pointer h-8';

  return (
    <div className="w-full h-full flex flex-col gap-5">

      {/* Date controls row  */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <p className="text-xs text-gray-400">
          {entityView === 'assets' ? 'Monthly breakdown · realtime' :
           entityView === 'department' ? 'By department · realtime' : 'By location · realtime'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={dateRange}
            onChange={e => _setDateRange(e.target.value as DateRange)}
            className={selectCls}
          >
            <option value="year">By year</option>
            <option value="quarter">By quarter</option>
          </select>
          {dateRange === 'quarter' && availableOptions.quarters.length > 0 && (
            <select value={selectedQuarter} onChange={e => _setSelectedQuarter(e.target.value)} className={selectCls}>
              {availableOptions.quarters.map(q => <option key={q}>{q}</option>)}
            </select>
          )}
          {dateRange === 'year' && availableOptions.years.length > 0 && (
            <select value={selectedYear} onChange={e => _setSelectedYear(e.target.value)} className={selectCls}>
              {availableOptions.years.map(y => <option key={y}>{y}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>

      {/* Condition pills */}
      <div className="flex gap-2 flex-wrap">
        {CONDITIONS.map(c => <ConditionPill key={c} condition={c} count={totals[c]} />)}
      </div>

      {/* View mode tabs*/}
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <TabButton active={viewMode === 'bar'}   onClick={() => setViewMode('bar')}>Bar chart</TabButton>
          <TabButton active={viewMode === 'trend'} onClick={() => setViewMode('trend')}>Trend</TabButton>
        </div>

        {/* Legend */}
        <div className="flex gap-3 ml-1 flex-wrap">
          {CONDITIONS.map(c => (
            <span key={c} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CONDITION_COLORS[c] }} />
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: 280 }}>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            No data for this period
          </div>
        ) : viewMode === 'bar' ? (
          // In bar charts, we stack the conditions for each time period or entity, with rounded corners on the top bars for better aesthetics
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: entityView !== 'assets' ? 36 : 4 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={0} angle={0} textAnchor='middle' height={entityView !== 'assets' ? 48 : 20} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="Spoiled" name="Spoiled" fill={CONDITION_COLORS['Spoiled']}  stackId="a" />
              <Bar dataKey="In-store" name="In-store" fill={CONDITION_COLORS['In-store']} stackId="a" />
              <Bar dataKey="In-use" name="In-use" fill={CONDITION_COLORS['In-use']}   stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {/* Area chart for trend view */}
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: entityView !== 'assets' ? 36 : 4 }}>
              <defs>
                {/* Define gradients for each condition */}
                {CONDITIONS.map(c => (
                  <linearGradient key={c} id={`grad-${c}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CONDITION_COLORS[c]} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CONDITION_COLORS[c]} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} angle={entityView !== 'assets' ? -25 : 0} textAnchor={entityView !== 'assets' ? 'end' : 'middle'} height={entityView !== 'assets' ? 48 : 20} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {CONDITIONS.map(c => (
                <Area
                  key={c}
                  type="monotone"
                  dataKey={c}
                  name={c}
                  stroke={CONDITION_COLORS[c]}
                  strokeWidth={2}
                  fill={`url(#grad-${c})`}
                  dot={{ r: 3, fill: CONDITION_COLORS[c], strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Spoilage alerts */}
      {spoiledItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Spoilage alerts
          </span>

          {/* Assets view: show top dept + top location with spoiled count */}
          {entityView === 'assets' && (
            <div className="flex gap-2.5 flex-wrap">
              <SpoilageAlert items={spoiledByDept} label="Department" />
              <SpoilageAlert items={spoiledByLocation} label="Location" />
            </div>
          )}

          {/* Department or Location view: show condition breakdown per entity */}
          {entityView !== 'assets' && entityConditionSummary && (
            <div className="flex flex-col gap-1.5">
              {entityConditionSummary.filter(e => e.Spoiled > 0).map(entity => {
                const isHigh = entity.Spoiled >= 5;
                return (
                  <div
                    key={entity.name}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-xs ${
                      isHigh ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`font-semibold text-sm truncate ${isHigh ? 'text-red-700' : 'text-amber-700'}`}>
                        {entity.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="flex items-center gap-1 text-blue-600">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        {entity['In-use']}
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        {entity['In-store']}
                      </span>
                      <span className={`flex items-center gap-1 font-semibold ${isHigh ? 'text-red-600' : 'text-amber-600'}`}>
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        {entity.Spoiled} spoiled
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-400 flex gap-4 flex-wrap pt-1 border-t border-gray-100 dark:border-gray-800">
        <span>
          Showing <strong className="text-gray-500 font-medium">{filteredData.length}</strong> assets
        </span>
        {lastDate && !isNaN(lastDate.getTime()) && (
          <span>
            Last updated: <strong className="text-gray-500 font-medium">{lastDate.toLocaleString()}</strong>
          </span>
        )}
      </div>

    </div>
  );
}
