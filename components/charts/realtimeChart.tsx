'use client';

/** Commented by Desmond @ 20-May-2026
 * This is a React Client Component — it runs in the browser.
 * Initial data is received as props from AssetChartLoader (Server Component).
 *
 * Changes @ 20-May-2026:
 * - Added 'All' as the default condition filter — shows total assets regardless of condition
 * - Condition filter pills are now clickable to filter the chart by a single condition
 * - Date range defaults to 'all' (show all time) instead of current year
 * - Responsive layout: controls stack vertically on mobile, chart height adjusts
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';

const CONDITIONS = ['In-use', 'In-store', 'Spoiled'] as const;
type Condition = typeof CONDITIONS[number];
// 'all' means no condition filter applied — show all assets
type ConditionFilter = Condition | 'all';

const CONDITION_COLORS: Record<Condition, string> = {
  'In-use':  '#3b82f6',
  'In-store': '#22c55e',
  'Spoiled': '#ef4444',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

// 'all' shows every asset regardless of date — no date filtering applied
type DateRange = 'all' | 'year' | 'quarter';
type ViewMode = 'bar' | 'trend';
type EntityView = 'assets' | 'department' | 'location';

const getMonthLabel = (ds: string) => { const d = new Date(ds); return isNaN(d.getTime()) ? ds : MONTH_NAMES[d.getMonth()]; };
const getMonthSortKey = (ds: string) => { const d = new Date(ds); return isNaN(d.getTime()) ? ds : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

const getSeasonalQuarter = (date: Date) => {
  const m = date.getMonth(), y = date.getFullYear();
  if (m >= 2 && m <= 4)  return { quarter: 1, year: y };
  if (m >= 5 && m <= 7)  return { quarter: 2, year: y };
  if (m >= 8 && m <= 10) return { quarter: 3, year: y };
  return { quarter: 4, year: (m === 0 || m === 1) ? y - 1 : y };
};

/** Clickable condition pill — active state shows it is filtering */
function ConditionPill({
  condition, count, active, onClick,
}: {
  condition: Condition; count: number; active: boolean; onClick: () => void;
}) {
  const color = CONDITION_COLORS[condition];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150 text-left ${
        active
          ? 'border-current shadow-sm'
          : 'border-gray-200 opacity-60 hover:opacity-90'
      }`}
      style={active ? { borderColor: color, backgroundColor: `${color}10` } : {}}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex flex-col gap-0">
        <span className="text-base font-semibold leading-none" style={{ color }}>{count}</span>
        <span className="text-[11px] text-gray-500 mt-0.5">{condition}</span>
      </div>
    </button>
  );
}

/** "All assets" pill — always shown as the default/reset filter */
function AllPill({ count, active, onClick }: { count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150 text-left ${
        active
          ? 'border-gray-400 bg-gray-50 shadow-sm'
          : 'border-gray-200 opacity-60 hover:opacity-90'
      }`}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400" />
      <div className="flex flex-col gap-0">
        <span className="text-base font-semibold leading-none text-gray-700">{count}</span>
        <span className="text-[11px] text-gray-500 mt-0.5">All assets</span>
      </div>
    </button>
  );
}

/** Spoilage alert card for department or location */
function SpoilageAlert({ items, label }: { items: { name: string; count: number }[]; label: string }) {
  if (!items.length) return null;
  const isHigh = items[0].count >= 5;
  return (
    <div className={`flex-1 min-w-[140px] p-3 rounded-xl border text-sm ${
      isHigh ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'
    }`}>
      <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${
        isHigh ? 'text-red-600' : 'text-amber-600'
      }`}>{label}</div>
      <div className="font-semibold text-gray-900 text-sm">
        {items.map(i => i.name).join(', ')}
      </div>
    </div>
  );
}

/** Custom recharts tooltip */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm min-w-[140px]">
      <div className="font-medium text-gray-700 mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4 items-center py-0.5">
          <span className="font-medium" style={{ color: p.color || p.fill }}>{p.name}</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="border-t border-gray-100 mt-2 pt-1.5 flex justify-between text-gray-500 font-medium">
          <span>Total</span>
          <span className="font-semibold text-gray-700">{total}</span>
        </div>
      )}
    </div>
  );
}

/** Tab button */
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 ${
        active
          ? 'bg-white text-gray-900 font-medium shadow-sm border border-gray-200'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

interface RealtimeChartProps {
  config: ChartConfig;
  entityView?: EntityView;
  initialAssets: any[];
  initialDepts: any[];
  initialLocs: any[];
}

export default function RealtimeChart({
  config,
  entityView: entityViewProp,
  initialAssets,
  initialDepts,
  initialLocs,
}: RealtimeChartProps) {
  const { tableName } = config;

  const [data, setData] = useState<any[]>(initialAssets);
  const [deptMap] = useState<Record<string, string>>(
    Object.fromEntries(initialDepts.map((d: any) => [d.department_id, d.name]))
  );
  const [locMap] = useState<Record<string, string>>(
    Object.fromEntries(initialLocs.map((l: any) => [l.location_id, l.name]))
  );

  // Default: show all assets across all time with no condition filter
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>('all');
  const [_entityView] = useState<EntityView>('assets');

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

  // Default quarter selection when data loads
  useEffect(() => {
    if (availableOptions.quarters.length > 0 && !selectedQuarter) {
      const { quarter, year } = getSeasonalQuarter(new Date());
      setSelectedQuarter(`${year}-Q${quarter}`);
    }
  }, [data]);

  // Supabase realtime subscription
  useEffect(() => {
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
    return () => { supabase.removeChannel(ch); };
  }, [tableName]);

  // Step 1: filter by date range
  const dateFilteredData = data.filter(item => {
    const ds = item.created_dt || item.created_at || item.updated_at;
    if (!ds) return false;
    const d = new Date(ds);
    if (isNaN(d.getTime())) return false;
    // 'all' — no date filter, show everything
    if (dateRange === 'all') return true;
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

  // Step 2: filter by condition ('all' skips this filter)
  const filteredData = conditionFilter === 'all'
    ? dateFilteredData
    : dateFilteredData.filter(item => item.condition === conditionFilter);

  const resolveName = (raw: any, lookupMap: Record<string, string>): string => {
    if (raw == null) return 'Unknown';
    if (typeof raw === 'object') return raw.name || 'Unknown';
    const key = String(raw);
    return lookupMap[key] || key || 'Unknown';
  };

  // Which conditions to render in the chart —
  // when a single condition is selected, only show that one series
  const activeConditions: Condition[] = conditionFilter === 'all'
    ? [...CONDITIONS]
    : [conditionFilter];

  const chartData = (() => {
    if (entityView === 'assets') {
      const map: Record<string, { time: string; sortKey: string } & Record<Condition, number>> = {};
      filteredData.forEach(item => {
        const ds = item.created_dt || item.created_at || item.updated_at;
        if (!ds) return;
        const cond = item.condition as Condition;
        if (!CONDITIONS.includes(cond)) return;
        const sortKey = getMonthSortKey(ds);
        const month = getMonthLabel(ds);
        if (!map[sortKey]) map[sortKey] = { time: month, sortKey, 'In-use': 0, 'In-store': 0, 'Spoiled': 0 };
        map[sortKey][cond]++;
      });
      return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }

    const field = entityView === 'department' ? 'department_id' : 'location_id';
    const lookupMap = entityView === 'department' ? deptMap : locMap;
    const map: Record<string, { time: string; sortKey: string } & Record<Condition, number>> = {};
    filteredData.forEach(item => {
      const cond = item.condition as Condition;
      if (!CONDITIONS.includes(cond)) return;
      const name = resolveName(item[field], lookupMap);
      if (name === 'Unknown') return;
      if (!map[name]) map[name] = { time: name, sortKey: name, 'In-use': 0, 'In-store': 0, 'Spoiled': 0 };
      map[name][cond]++;
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  })();

  // Totals are always based on ALL date-filtered data (not condition-filtered)
  // so the pills always show the real counts regardless of which is selected
  const totals = CONDITIONS.reduce((acc, c) => {
    if (entityView === 'assets') {
      acc[c] = dateFilteredData.filter(i => i.condition === c).length;
    } else {
      acc[c] = chartData.reduce((sum, row) => sum + ((row as any)[c] || 0), 0);
    }
    return acc;
  }, {} as Record<Condition, number>);

  const totalAll = dateFilteredData.length;

  // Pie data — used when dateRange is 'all', for any entityView
  const pieData = activeConditions
    .map(c => ({ name: c, value: totals[c], color: CONDITION_COLORS[c] }))
    .filter(d => d.value > 0);

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
  const spoiledByDept = rankBy('department_id', deptMap);
  const spoiledByLocation = rankBy('location_id', locMap);

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
    return Object.entries(map)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.Spoiled - a.Spoiled || b.total - a.total);
  })();

  const selectCls = 'px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-700 focus:border-blue-400 outline-none cursor-pointer h-8';

  // XAxis always horizontal
  const xAxisAngle = 0;
  const xAxisHeight = 20;

  return (
    <div className="w-full flex flex-col gap-4">

      {/* Row 1: subtitle + live indicator + date controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs text-gray-400">
          {entityView === 'assets' ? 'Asset condition · realtime' :
           entityView === 'department' ? 'By department · realtime' : 'By location · realtime'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range selector */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as DateRange)}
            className={selectCls}
          >
            <option value="all">All time</option>
            <option value="year">By year</option>
            <option value="quarter">By quarter</option>
          </select>
          {dateRange === 'quarter' && availableOptions.quarters.length > 0 && (
            <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)} className={selectCls}>
              {availableOptions.quarters.map(q => <option key={q}>{q}</option>)}
            </select>
          )}
          {dateRange === 'year' && availableOptions.years.length > 0 && (
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={selectCls}>
              {availableOptions.years.map(y => <option key={y}>{y}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>

      {/* Row 2: condition filter pills — clicking one filters the chart */}
      <div className="flex gap-2 flex-wrap">
        {/* 'All assets' pill — default, resets condition filter */}
        <AllPill
          count={totalAll}
          active={conditionFilter === 'all'}
          onClick={() => setConditionFilter('all')}
        />
        {CONDITIONS.map(c => (
          <ConditionPill
            key={c}
            condition={c}
            count={totals[c]}
            active={conditionFilter === c}
            onClick={() => setConditionFilter(prev => prev === c ? 'all' : c)}
          />
        ))}
      </div>

      {/* Chart: pie when All time, Bar/Trend when By year or By quarter */}
      {dateRange === 'all' ? (
        <div className="w-full h-[220px] sm:h-[240px]">
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              No data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="75%"
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value ?? 0, name]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <>
          {/* Row 3: view mode tabs + legend */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-0.5 bg-gray-100 p-1 rounded-lg border border-gray-200">
              <TabButton active={viewMode === 'bar'}   onClick={() => setViewMode('bar')}>Bar</TabButton>
              <TabButton active={viewMode === 'trend'} onClick={() => setViewMode('trend')}>Trend</TabButton>
            </div>
            {/* Legend — only show active conditions */}
            <div className="flex gap-3 flex-wrap">
              {activeConditions.map(c => (
                <span key={c} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CONDITION_COLORS[c] }} />
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Chart — height is smaller on mobile to avoid overflow */}
          <div className="w-full h-[220px] sm:h-[260px] lg:h-[280px]">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                No data for this period
              </div>
            ) : viewMode === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: -28, bottom: xAxisHeight }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={xAxisAngle}
                    textAnchor={xAxisAngle !== 0 ? 'end' : 'middle'}
                    height={xAxisHeight}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  {/* Render only active conditions so single-condition filter hides others */}
                  {activeConditions.includes('Spoiled') && (
                    <Bar dataKey="Spoiled" name="Spoiled" fill={CONDITION_COLORS['Spoiled']} stackId="a" />
                  )}
                  {activeConditions.includes('In-store') && (
                    <Bar dataKey="In-store" name="In-store" fill={CONDITION_COLORS['In-store']} stackId="a" />
                  )}
                  {activeConditions.includes('In-use') && (
                    <Bar dataKey="In-use" name="In-use" fill={CONDITION_COLORS['In-use']} stackId="a" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: -28, bottom: xAxisHeight }}
                >
                  <defs>
                    {activeConditions.map(c => (
                      <linearGradient key={c} id={`grad-${c}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CONDITION_COLORS[c]} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={CONDITION_COLORS[c]} stopOpacity={0.01} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={xAxisAngle}
                    textAnchor={xAxisAngle !== 0 ? 'end' : 'middle'}
                    height={xAxisHeight}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<CustomTooltip />} />
                  {activeConditions.map(c => (
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
        </>
      )}

      {/* Spoilage alerts — only shown when spoiled assets exist in filtered data */}
      {spoiledItems.length > 0 && (conditionFilter === 'all' || conditionFilter === 'Spoiled') && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Spoilage alerts
          </span>
          {entityView === 'assets' && (
            <div className="flex gap-2.5 flex-wrap">
              <SpoilageAlert items={spoiledByDept} label="Department" />
              <SpoilageAlert items={spoiledByLocation} label="Location" />
            </div>
          )}
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
                    <span className={`font-semibold text-sm truncate ${isHigh ? 'text-red-700' : 'text-amber-700'}`}>
                      {entity.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-400 flex gap-4 flex-wrap pt-1 border-t border-gray-100">
        <span>
          Showing <strong className="text-gray-500 font-medium">{filteredData.length}</strong>
          {conditionFilter !== 'all' ? ` ${conditionFilter}` : ''} assets
        </span>
      </div>

    </div>
  );
}
