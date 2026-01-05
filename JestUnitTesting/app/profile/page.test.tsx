import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ProfilePage from '@/app/(app)/profile/page';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/components/ui/Breadcrumb', () => {
  return function MockBreadcrumb({ customItems }: any) {
    return (
      <div data-testid="breadcrumb">
        {customItems.map((item: any, index: number) => (
          <span key={index}>{item.label}</span>
        ))}
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();
global.alert = jest.fn();

describe('ProfilePage', () => {
  const mockPush = jest.fn();
  const mockSession = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    staffId: 'S001',
    mobileNo: '+60123456789',
    departmentId: 'IT',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it('renders profile page with user information', () => {
    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    render(<ProfilePage />);

    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('S001')).toBeInTheDocument();
    expect(screen.getByText('+60123456789')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });

  it('displays loading state when session is not available', () => {
    (useSession as jest.Mock).mockReturnValue({ session: null });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    render(<ProfilePage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays N/A for missing optional fields', () => {
    const incompleteSession = {
      name: 'Jane Doe',
      staffId: 'S002',
    };

    (useSession as jest.Mock).mockReturnValue({ session: incompleteSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    render(<ProfilePage />);

    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });

  it('fetches and displays assigned assets', async () => {
    const mockAssets = [
      {
        id: 1,
        asset_id: 'A001',
        asset: {
          name: 'Laptop Dell XPS',
          asset_id: 'A001',
          category: 'Computer',
        },
      },
      {
        id: 2,
        asset_id: 'A002',
        asset: {
          name: 'Monitor Samsung',
          asset_id: 'A002',
          category: 'Display',
        },
      },
    ];

    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => {
      render(<ProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Laptop Dell XPS')).toBeInTheDocument();
      expect(screen.getByText('Monitor Samsung')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching assets', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => { }) // Never resolves
    );

    render(<ProfilePage />);

    expect(screen.getByText('Loading assets...')).toBeInTheDocument();
  });

  it('displays message when no assets are assigned', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => {
      render(<ProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('No assets assigned yet')).toBeInTheDocument();
    });
  });

  it('displays only first 3 assets when more than 3 are assigned', async () => {
    const mockAssets = [
      {
        id: 1,
        asset_id: 'A001',
        asset: { name: 'Asset 1', asset_id: 'A001', category: 'Computer' },
      },
      {
        id: 2,
        asset_id: 'A002',
        asset: { name: 'Asset 2', asset_id: 'A002', category: 'Display' },
      },
      {
        id: 3,
        asset_id: 'A003',
        asset: { name: 'Asset 3', asset_id: 'A003', category: 'Keyboard' },
      },
      {
        id: 4,
        asset_id: 'A004',
        asset: { name: 'Asset 4', asset_id: 'A004', category: 'Mouse' },
      },
      {
        id: 5,
        asset_id: 'A005',
        asset: { name: 'Asset 5', asset_id: 'A005', category: 'Headset' },
      },
    ];

    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => {
      render(<ProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Asset 1')).toBeInTheDocument();
      expect(screen.getByText('Asset 2')).toBeInTheDocument();
      expect(screen.getByText('Asset 3')).toBeInTheDocument();
      expect(screen.queryByText('Asset 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Asset 5')).not.toBeInTheDocument();
    });
  });

  it('shows "View All" button when more than 3 assets are assigned', async () => {
    const mockAssets = [
      {
        id: 1,
        asset_id: 'A001',
        asset: { name: 'Asset 1', asset_id: 'A001', category: 'Computer' },
      },
      {
        id: 2,
        asset_id: 'A002',
        asset: { name: 'Asset 2', asset_id: 'A002', category: 'Display' },
      },
      {
        id: 3,
        asset_id: 'A003',
        asset: { name: 'Asset 3', asset_id: 'A003', category: 'Keyboard' },
      },
      {
        id: 4,
        asset_id: 'A004',
        asset: { name: 'Asset 4', asset_id: 'A004', category: 'Mouse' },
      },
    ];

    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => {
      render(<ProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/View All Assets \(4\)/i)).toBeInTheDocument();
    });
  });

  it('calls alert when "View All" button is clicked', async () => {
    const mockAssets = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: {
        name: `Asset ${i + 1}`,
        asset_id: `A00${i + 1}`,
        category: 'Computer',
      },
    }));

    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => {
      render(<ProfilePage />);
    });

    await waitFor(() => {
      const viewAllButton = screen.getByText(/View All Assets/i);
      fireEvent.click(viewAllButton);
      expect(global.alert).toHaveBeenCalledWith('Assigned Assets page - to be implemented');
    });
  });

  it('handles API errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    await act(async () => {
      render(<ProfilePage />);
    });

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Error fetching assets:', expect.any(Error));
    });

    consoleError.mockRestore();
  });

  it('renders breadcrumb with correct items', () => {
    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    render(<ProfilePage />);

    const breadcrumb = screen.getByTestId('breadcrumb');
    expect(breadcrumb).toBeInTheDocument();
    expect(breadcrumb).toHaveTextContent('Home');
    expect(breadcrumb).toHaveTextContent('Profile');
  });

  it('displays asset category correctly', async () => {
    const mockAssets = [
      {
        id: 1,
        asset_id: 'A001',
        asset: {
          name: 'Test Asset',
          asset_id: 'A001',
          category: 'Laptop',
        },
      },
    ];

    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => {
      render(<ProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Laptop/i)).toBeInTheDocument();
    });
  });

  it('handles missing asset data gracefully', async () => {
    const mockAssets = [
      {
        id: 1,
        asset_id: 'A001',
        asset: null, // Missing asset data
      },
    ];

    (useSession as jest.Mock).mockReturnValue({ session: mockSession });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => {
      render(<ProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Unknown Asset')).toBeInTheDocument();
      expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
    });
  });
});
