/**
 * Unit tests for the Profile page
 *
 * The page uses two hooks together:
 *   - useAuth (hooks/useAuth.ts): checks session, redirects unauthenticated users
 *   - useSession (next-auth/react): provides session data for displaying user info
 *
 * Both are mocked so tests run without a real auth server.
 *
 * What we cover:
 *   - Returns null while auth is still loading
 *   - Returns null and redirects when user is not authenticated
 *   - Renders the full profile UI when authenticated
 *   - Displays each session field (name, email, staffId, mobileNo, departmentId)
 *   - Shows N/A for any missing optional fields
 *   - Shows 'Loading...' in each field while NextAuth session status is 'loading'
 *   - Fetches assigned assets via POST /api/staff/assets using staffId from session
 *   - Shows "Loading assets..." while the fetch is in progress
 *   - Shows "No assets assigned yet" when the API returns an empty list
 *   - Renders up to 3 assets, hides the rest
 *   - Shows the "View All Assets (n)" button only when there are more than 3 assets
 *   - Clicking "View All Assets" fires the placeholder alert
 *   - Displays asset name and falls back to "Unknown Asset" when asset data is null
 *   - Displays asset category, falls back to "N/A" when missing
 *   - Logs console.error and stops loading on fetch failure
 *   - Does NOT fetch assets when staffId is absent from the session
 *   - Renders breadcrumb with Home and Profile items
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProfilePage from '@/app/(app)/profile/page';

// mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// mock next-auth/react — useSession is called directly by the page for field display
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// mock useAuth — controls the isLoading / isAuthenticated gate
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// mock Breadcrumb so we can assert on items without rendering the real component
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

// mock fetch and alert
global.fetch = jest.fn();
global.alert = jest.fn();

// helper: a fully-populated session user object matching what the page reads
const mockSessionUser = {
  name: 'Jun Zhen Wong',
  email: 'junzhen@swin.edu.my',
  staffId: 'S001',
  mobileNo: '0123456789',
  departmentId: 'IT',
};

describe('ProfilePage', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: mockReplace });
  });

  // ─── Auth gate ─────────────────────────────────────────────────────────────

  /**
   * While useAuth is still checking the session it sets isLoading=true.
   * The page should render nothing (return null) so the user sees no flash.
   */
  it('renders nothing while auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: true, isAuthenticated: false });
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });
    // fetch never needed — resolve to avoid warnings
    (global.fetch as jest.Mock).mockResolvedValue({ json: () => Promise.resolve({ success: true, assets: [] }) });

    const { container } = render(<ProfilePage />);

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Unauthenticated users get null too — useAuth handles the redirect internally,
   * the page just returns null on its side.
   */
  it('renders nothing when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: false });
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });
    (global.fetch as jest.Mock).mockResolvedValue({ json: () => Promise.resolve({ success: true, assets: [] }) });

    const { container } = render(<ProfilePage />);

    expect(container).toBeEmptyDOMElement();
  });

  // ─── Rendering when authenticated ─────────────────────────────────────────

  /**
   * When authenticated the page title and all user fields should be visible
   */
  it('renders the profile page when authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    expect(screen.getByText('User Profile')).toBeInTheDocument();
  });

  /**
   * Each field reads from session?.user — name, email, staffId, mobileNo, departmentId
   */
  it('displays all user fields from the session', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    expect(screen.getByText('Jun Zhen Wong')).toBeInTheDocument();
    expect(screen.getByText('junzhen@swin.edu.my')).toBeInTheDocument();
    expect(screen.getByText('S001')).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });

  /**
   * If optional fields are absent from the session, the page shows N/A for each one
   */
  it('shows N/A for missing optional fields', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    // staffId is missing so no asset fetch will happen either
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    // email, staffId, mobileNo, departmentId are all missing — each shows N/A
    const naItems = screen.getAllByText('N/A');
    expect(naItems.length).toBeGreaterThanOrEqual(4);
  });

  /**
   * When NextAuth status is still 'loading', each field renders the text 'Loading...'
   * instead of N/A or actual data
   */
  it('shows Loading... in fields while NextAuth session status is loading', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    render(<ProfilePage />);

    // There are 5 fields that each show 'Loading...' (name, email, staffId, mobileNo, departmentId)
    const loadingItems = screen.getAllByText('Loading...');
    expect(loadingItems.length).toBe(5);
  });

  // ─── Breadcrumb ────────────────────────────────────────────────────────────

  /**
   * Breadcrumb should have Home and Profile items
   */
  it('renders breadcrumb with Home and Profile', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    const breadcrumb = screen.getByTestId('breadcrumb');
    expect(breadcrumb).toHaveTextContent('Home');
    expect(breadcrumb).toHaveTextContent('Profile');
  });

  // ─── Asset fetching ────────────────────────────────────────────────────────

  /**
   * The page POSTs to /api/staff/assets with the staffId from session.
   * While waiting for the response it should show "Loading assets..."
   */
  it('shows Loading assets... while the fetch is in progress', () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    // never resolves so the loading state stays visible
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<ProfilePage />);

    expect(screen.getByText('Loading assets...')).toBeInTheDocument();
  });

  /**
   * When the API returns an empty list the "no assets" message should appear
   */
  it('shows no assets message when API returns empty list', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText('No assets assigned yet')).toBeInTheDocument();
    });
  });

  /**
   * When staffId is not in the session the page should not call fetch at all
   */
  it('does not fetch assets when staffId is missing from session', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'No ID User' } }, // no staffId
      status: 'authenticated',
    });

    await act(async () => { render(<ProfilePage />); });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * The fetch call should use POST and pass staffId in the body
   */
  it('calls POST /api/staff/assets with the correct staffId', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    expect(global.fetch).toHaveBeenCalledWith('/api/staff/assets', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ staffId: 'S001' }),
    }));
  });

  /**
   * When fetch throws a network error, console.error is called and loading stops
   * (the page should not crash)
   */
  it('handles fetch error gracefully and stops loading', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching assets:', expect.any(Error));
      // loading state should be gone — no more "Loading assets..." spinner
      expect(screen.queryByText('Loading assets...')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  // ─── Asset display ─────────────────────────────────────────────────────────

  /**
   * Asset name and category should render for each returned asset
   */
  it('renders asset name and category for fetched assets', async () => {
    const mockAssets = [
      { id: 1, asset_id: 'A001', asset: { name: 'Dell Laptop', asset_id: 'A001', category: 'Computer' } },
      { id: 2, asset_id: 'A002', asset: { name: 'Samsung Monitor', asset_id: 'A002', category: 'Display' } },
    ];

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText('Dell Laptop')).toBeInTheDocument();
      expect(screen.getByText('Samsung Monitor')).toBeInTheDocument();
      expect(screen.getByText(/Computer/)).toBeInTheDocument();
      expect(screen.getByText(/Display/)).toBeInTheDocument();
    });
  });

  /**
   * When an assignment has asset: null the page falls back to "Unknown Asset" and "N/A"
   */
  it('shows Unknown Asset and N/A when asset data is null', async () => {
    const mockAssets = [{ id: 1, asset_id: 'A001', asset: null }];

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText('Unknown Asset')).toBeInTheDocument();
    });
  });

  /**
   * The page only shows the first 3 assets — the 4th and 5th should not appear
   */
  it('shows only the first 3 assets when more than 3 are returned', async () => {
    const mockAssets = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: { name: `Asset ${i + 1}`, asset_id: `A00${i + 1}`, category: 'Other' },
    }));

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText('Asset 1')).toBeInTheDocument();
      expect(screen.getByText('Asset 2')).toBeInTheDocument();
      expect(screen.getByText('Asset 3')).toBeInTheDocument();
      expect(screen.queryByText('Asset 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Asset 5')).not.toBeInTheDocument();
    });
  });

  /**
   * "View All Assets (n)" button only appears when there are more than 3 assets
   */
  it('shows View All button only when there are more than 3 assets', async () => {
    const mockAssets = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: { name: `Asset ${i + 1}`, asset_id: `A00${i + 1}`, category: 'Other' },
    }));

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText(/View All Assets \(4\)/i)).toBeInTheDocument();
    });
  });

  /**
   * "View All Assets" button should NOT appear when there are exactly 3 or fewer assets
   */
  it('does not show View All button when there are 3 or fewer assets', async () => {
    const mockAssets = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: { name: `Asset ${i + 1}`, asset_id: `A00${i + 1}`, category: 'Other' },
    }));

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.queryByText(/View All Assets/i)).not.toBeInTheDocument();
    });
  });

  /**
   * Clicking "View All Assets" fires the placeholder alert
   */
  it('fires the placeholder alert when View All button is clicked', async () => {
    const mockAssets = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: { name: `Asset ${i + 1}`, asset_id: `A00${i + 1}`, category: 'Other' },
    }));

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      fireEvent.click(screen.getByText(/View All Assets/i));
      expect(global.alert).toHaveBeenCalledWith('Assigned Assets page - to be implemented');
    });
  });
});
