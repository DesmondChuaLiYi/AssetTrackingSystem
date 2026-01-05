import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/(app)/admin/dashboard/page';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/components/ui/Breadcrumb', () => {
  return function MockBreadcrumb() {
    return <div data-testid="breadcrumb">Breadcrumb</div>;
  };
});

jest.mock('@/components/charts/realtimeChart', () => {
  return function MockRealtimeChart({ config }: any) {
    return <div data-testid="realtime-chart">{config.title}</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('DashboardPage', () => {
  const mockPush = jest.fn();
  const mockSession = {
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useSession as jest.Mock).mockReturnValue({ session: mockSession });

    // Mock fetch responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/assets')) {
        return Promise.resolve({
          json: () => Promise.resolve({ totalItems: 150 }),
        });
      }
      if (url.includes('/api/department')) {
        return Promise.resolve({
          json: () => Promise.resolve({ data: [{ id: 1 }, { id: 2 }] }),
        });
      }
      if (url.includes('/api/staff')) {
        return Promise.resolve({
          json: () => Promise.resolve({ staff: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
        });
      }
      if (url.includes('/api/location')) {
        return Promise.resolve({
          json: () => Promise.resolve({ data: [{ id: 1 }] }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('renders dashboard with user name', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Test User/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays dashboard stats', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('displays stat cards with correct titles', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      const totalAssetsElements = screen.getAllByText('Total Assets');
      expect(totalAssetsElements.length).toBeGreaterThan(0);

      expect(screen.getByText('Staff Members')).toBeInTheDocument();

      const locationElements = screen.getAllByText('Locations');
      expect(locationElements.length).toBeGreaterThan(0);
    });
  });

  it('navigates to correct page when stat card is clicked', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      const statCards = screen.getAllByText('Total Assets');
      const statCard = statCards[0].closest('div[class*="cursor-pointer"]');

      if (statCard) {
        fireEvent.click(statCard);
        expect(mockPush).toHaveBeenCalledWith('/admin/assetTracking/Assets');
      }
    });
  });

  it('renders quick action buttons', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('View All Assets')).toBeInTheDocument();
      expect(screen.getByText('Manage Staff')).toBeInTheDocument();

      const departmentElements = screen.getAllByText(/Departments?/i);
      expect(departmentElements.length).toBeGreaterThan(0);
    });
  });

  it('navigates when quick action button is clicked', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      const viewAssetsButton = screen.getByText('View All Assets');
      fireEvent.click(viewAssetsButton);
      expect(mockPush).toHaveBeenCalledWith('/admin/assetTracking/Assets');
    });
  });

  it('displays refresh button', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    const refreshButton = screen.getByText('Refresh');

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(8);
    }, { timeout: 3000 });
  });

  it('renders chart section with dropdown', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();
    });
  });

  it('changes chart when dropdown selection changes', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;

      act(() => {
        fireEvent.change(dropdown, { target: { value: 'departments' } });
      });

      expect(dropdown.value).toBe('departments');
    });
  });

  it('displays loading state initially', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => { })
    );

    await act(async () => {
      render(<DashboardPage />);
    });

    const allElements = document.querySelectorAll('.animate-pulse');
    expect(allElements.length).toBeGreaterThan(0);
  });

  it('redirects to home when no session', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: null });

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      const routerMock = (useRouter as jest.Mock).mock.results[0].value;
      expect(routerMock.replace).toHaveBeenCalledWith('/');  // Change this to '/'
    });
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled();
    });

    consoleError.mockRestore();
  });

  it('displays Recent Activity section', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('shows placeholder message in Recent Activity', async () => {
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Recent activity tracking will be implemented here')
      ).toBeInTheDocument();
    });
  });
});