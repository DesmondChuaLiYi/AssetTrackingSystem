'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

interface RealtimeChartProps {
  config: ChartConfig;
}

type DateRange = 'quarter' | 'year';

export default function RealtimeChart({ config }: RealtimeChartProps) {
  const {
    tableName,
    title,
    valueKey,
    labelKey,
    chartType = 'line',
    color = '#8884d8',
    limit = 50
  } = config;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('year');
//   const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Get available months, quarters, and years from data
  const getAvailableOptions = () => {
    const months = new Set<string>();
    const quarters = new Set<string>();
    const years = new Set<string>();

    data.forEach(item => {
      const dateStr = item.created_dt || item.created_at || item.updated_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          // Add month (e.g., "2024-10" for October 2024)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          months.add(monthKey);

          // Add seasonal quarter
          // Q1 (Spring): March(2), April(3), May(4)
          // Q2 (Summer): June(5), July(6), August(7)
          // Q3 (Autumn): September(8), October(9), November(10)
          // Q4 (Winter): December(11), January(0), February(1)
          const month = date.getMonth();
          let quarter;
          let year = date.getFullYear();
          
          if (month >= 2 && month <= 4) { // March, April, May
            quarter = 1; // Spring
          } else if (month >= 5 && month <= 7) { // June, July, August
            quarter = 2; // Summer
          } else if (month >= 8 && month <= 10) { // September, October, November
            quarter = 3; // Autumn
          } else { // December, January, February
            quarter = 4; // Winter
            // If January or February, it belongs to the previous year's winter
            if (month === 0 || month === 1) {
              year = year - 1;
            }
          }
          
          quarters.add(`${year}-Q${quarter}`);

          // Add year
          years.add(String(date.getFullYear()));
        }
      }
    });

    return {
      months: Array.from(months).sort().reverse(),
      quarters: Array.from(quarters).sort().reverse(),
      years: Array.from(years).sort().reverse()
    };
  };

  const availableOptions = getAvailableOptions();

  // Initialize selected options with the most recent ones
  useEffect(() => {
    if (availableOptions.quarters.length > 0 && !selectedQuarter) {
      // Default to current seasonal quarter
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      let currentQuarter;
      let quarterYear = year;
      
      if (month >= 2 && month <= 4) { 
        currentQuarter = 1; // Spring (March, April, May)
      } else if (month >= 5 && month <= 7) { 
        currentQuarter = 2; // Summer (June, July, August)
      } else if (month >= 8 && month <= 10) { 
        currentQuarter = 3; // Autumn (September, October, November)
      } else { 
        currentQuarter = 4; // Winter (December, January, February)

        // If January or February, use previous year's winter
        if (month === 0 || month === 1) {
          quarterYear = year - 1;
        }
      }
      
      setSelectedQuarter(`${quarterYear}-Q${currentQuarter}`);
    }
    if (availableOptions.years.length > 0 && !selectedYear) {
      setSelectedYear(availableOptions.years[0]);
    }
  }, [data, dateRange]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: initialData, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .order('created_dt', { ascending: true })
        .limit(limit);

      if (fetchError) {
        console.error('Error fetching data:', fetchError);
        setError(fetchError.message);
      } else {
        setData(initialData || []);
      }
      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          console.log(`${tableName} change:`, payload);

          if (payload.eventType === 'INSERT') {
            setData((current) => {
              const newData = [...current, payload.new];
              return newData.slice(-limit);
            });
          } else if (payload.eventType === 'UPDATE') {
            setData((current) =>
              current.map((item) =>
                item.id === payload.new.id ? payload.new : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData((current) =>
              current.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, limit]);

  // Filter data based on selected date range
  const getFilteredData = () => {
    return data.filter(item => {
      const dateStr = item.created_dt || item.created_at || item.updated_at;
      if (!dateStr) return false;
      const itemDate = new Date(dateStr);
      if (isNaN(itemDate.getTime())) return false;

      if (dateRange === 'quarter' && selectedQuarter) {
        const [yearStr, quarterStr] = selectedQuarter.split('-Q');
        const quarter = parseInt(quarterStr);
        const year = parseInt(yearStr);
        
        // Seasonal quarters:
        // Q1 (Spring): March(2), April(3), May(4)
        // Q2 (Summer): June(5), July(6), August(7)
        // Q3 (Autumn): September(8), October(9), November(10)
        // Q4 (Winter): December(11), January(0), February(1)
        
        // Spring (March, April, May)
        if (quarter === 1) { 
          return itemDate.getFullYear() === year &&
                 itemDate.getMonth() >= 2 && itemDate.getMonth() <= 4;
        } 
        // Summer (June, July, August)
        else if (quarter === 2) { 
          return itemDate.getFullYear() === year &&
                 itemDate.getMonth() >= 5 && itemDate.getMonth() <= 7;
        } 
        // Autumn (September, October, November)
        else if (quarter === 3) {
          return itemDate.getFullYear() === year &&
                 itemDate.getMonth() >= 8 && itemDate.getMonth() <= 10;
        } 
        // Winter (December, January, February)
        else if (quarter === 4) { 
        // December of current year OR January/February of next year
          return (itemDate.getFullYear() === year && itemDate.getMonth() === 11) ||
                 (itemDate.getFullYear() === year + 1 && (itemDate.getMonth() === 0 || itemDate.getMonth() === 1));
        }
      }

      if (dateRange === 'year' && selectedYear) {
        return itemDate.getFullYear() === parseInt(selectedYear);
      }

      return true;
    });
  };

  // Format date to "Nov 2"
  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Format month key ("2024-10" to "October 2024")
//   const formatMonth = (monthKey: string) => {
//     const [year, month] = monthKey.split('-');
//     const date = new Date(parseInt(year), parseInt(month) - 1);
//     return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
//   };

  // Format data for chart: Group by date and count
  const chartData = (() => {
    const filteredData = getFilteredData();

    if (valueKey === 'count') {
      // Group by date and count 
      const dateGroups = filteredData.reduce((acc, item) => {
        const dateStr = item.created_dt || item.created_at || item.updated_at;
        if (dateStr) {
          const formattedDate = formatDateShort(dateStr);
          acc[formattedDate] = (acc[formattedDate] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(dateGroups).map(([date, count]) => ({
        time: date,
        value: count,
        label: 'Assets'
      }));
    }

    // Original mapping for other value types
    return filteredData.map((item, index) => {
      let timeLabel = `Item ${index + 1}`;
      
      if (item.created_at || item.created_dt) {
        const dateStr = item.created_at || item.created_dt;
        timeLabel = formatDateShort(dateStr);
      }
      
      return {
        time: timeLabel,
        value: typeof item[valueKey] === 'number' ? item[valueKey] : index + 1,
        label: labelKey ? item[labelKey] : valueKey
      };
    });
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-lg">Loading {title}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range Type Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="year">Year</option>
            <option value="quarter">Quarter</option>
          </select>

          {/* Specific Quarter Selector */}
          {dateRange === 'quarter' && availableOptions.quarters.length > 0 && (
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none hover:border-gray-400 transition-colors cursor-pointer"
            >
              {availableOptions.quarters.map(quarter => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </select>
          )}

          {/* Specific Year Selector */}
          {dateRange === 'year' && availableOptions.years.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none hover:border-gray-400 transition-colors cursor-pointer"
            >
              {availableOptions.years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
          
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs sm:text-sm text-gray-500">Live</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400} minHeight={350}>
        {chartType === 'combo' ? (
          <ComposedChart 
            data={chartData}
            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis  
              domain={[0, 'dataMax']}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ fontSize: '12px' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Bar dataKey="value" fill={color} name="Count" />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Trend"
            />
          </ComposedChart>
        ) : chartType === 'line' ? (
          <LineChart 
            data={chartData}
            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis  
              domain={[0, 'dataMax']}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ fontSize: '12px' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        ) : (
          <BarChart 
            data={chartData}
            margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis  
              domain={[0, 'dataMax']}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ fontSize: '12px' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Bar dataKey="value" fill={color} />
          </BarChart>
        )}
      </ResponsiveContainer>
      <div className="mt-2 text-xs sm:text-sm text-gray-500">
        Total records: {getFilteredData().length}
        {data.length > 0 && (data[data.length - 1].created_at || data[data.length - 1].updated_at) && (
          <> | Last updated: {
            (() => {
              const lastItem = data[data.length - 1];
              const dateStr = lastItem.created_at || lastItem.updated_at;
              const date = new Date(dateStr);
              return !isNaN(date.getTime()) ? date.toLocaleString() : 'N/A';
            })()
          }</>
        )}
      </div>
    </div>
  );
}