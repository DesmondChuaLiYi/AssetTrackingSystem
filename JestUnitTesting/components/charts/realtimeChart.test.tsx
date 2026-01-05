import { render, screen, waitFor } from '@testing-library/react';
import RealtimeChart from '@/components/charts/RealtimeChart';

// Mock Supabase - define everything INSIDE the factory function
jest.mock('@supabase/supabase-js', () => {
  // Define all mocks inside the factory
  const mockSubscribe = jest.fn(() => Promise.resolve());
  const mockOn = jest.fn().mockReturnThis();
  const mockRemoveChannel = jest.fn();
  const mockChannel = jest.fn(() => ({
    on: mockOn,
    subscribe: mockSubscribe,
  }));

  return {
    createClient: jest.fn(() => ({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() =>
              Promise.resolve({
                data: [
                  { id: 1, count: 10, created_dt: '2024-01-15T10:00:00Z' },
                  { id: 2, count: 15, created_dt: '2024-02-20T10:00:00Z' },
                  { id: 3, count: 20, created_dt: '2024-03-25T10:00:00Z' },
                ],
                error: null,
              })
            ),
          })),
        })),
      })),
      channel: mockChannel,
      removeChannel: mockRemoveChannel,
    })),
  };
});

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe('RealtimeChart', () => {
  const defaultConfig = {
    tableName: 'asset',
    title: 'Total Assets',
    valueKey: 'count',
    labelKey: 'category',
    chartType: 'line' as const,
    color: '#3b82f6',
    limit: 50,
    dateKey: 'created_dt',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart with title', async () => {
    const { unmount } = render(<RealtimeChart config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
    }, { timeout: 5000 });

    unmount();
  });

  it('displays loading state initially', () => {
    const { unmount } = render(<RealtimeChart config={defaultConfig} />);
    expect(screen.getByText('Loading Total Assets...')).toBeInTheDocument();
    unmount();
  });

  it('renders line chart when chartType is line', async () => {
    const { unmount } = render(<RealtimeChart config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    }, { timeout: 5000 });

    unmount();
  });
});