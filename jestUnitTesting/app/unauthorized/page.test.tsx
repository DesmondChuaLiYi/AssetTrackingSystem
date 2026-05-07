/**
 * Unit tests for the Unauthorized page
 *
 * This page is shown when a non-admin user tries to access an admin route.
 * It has role-aware button logic:
 *   - "Go Back" always visible (calls router.back())
 *   - "Go to Your Dashboard" only visible for role === 'staff'
 *     (pending/rejected users must not see it)
 *   - "Return to Login" always visible (calls signOut with callbackUrl '/login')
 *
 * What we cover:
 *   - Renders the Access Denied heading and description text
 *   - "Go Back" button is always present
 *   - "Return to Login" button is always present
 *   - "Go to Your Dashboard" button only shows when role is 'staff'
 *   - "Go to Your Dashboard" does NOT show for role 'admin'
 *   - "Go to Your Dashboard" does NOT show for role 'pending'
 *   - "Go to Your Dashboard" does NOT show when there is no session
 *   - Clicking "Go Back" calls router.back()
 *   - Clicking "Go to Your Dashboard" pushes to /user/dashboard
 *   - Clicking "Return to Login" calls signOut with callbackUrl '/login'
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import UnauthorisedPage from '@/app/(app)/unauthorized/page';

// mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// mock heroicons so the SVG doesn't cause issues in jsdom
jest.mock('@heroicons/react/24/outline', () => ({
  ShieldExclamationIcon: () => <svg data-testid="shield-icon" />,
}));

describe('UnauthorisedPage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (signOut as jest.Mock).mockResolvedValue(undefined);
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────

  /**
   * The main heading and description should always render regardless of role
   */
  it('renders Access Denied heading and description', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/You don't have permission to access this page/i)).toBeInTheDocument();
    expect(screen.getByText(/This page is restricted to administrators only/i)).toBeInTheDocument();
  });

  /**
   * "Go Back" button must always be visible — all users can navigate away
   */
  it('always renders the Go Back button', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  /**
   * "Return to Login" button must always be visible
   */
  it('always renders the Return to Login button', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    expect(screen.getByText('Return to Login')).toBeInTheDocument();
  });

  // ─── Role-based dashboard button ───────────────────────────────────────────

  /**
   * Staff users should see the dashboard button so they can go to their own area
   */
  it('shows Go to Your Dashboard button for role staff', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'staff' } },
    });

    render(<UnauthorisedPage />);

    expect(screen.getByText('Go to Your Dashboard')).toBeInTheDocument();
  });

  /**
   * Admin users should not see the dashboard button — they shouldn't have landed here
   */
  it('does not show Go to Your Dashboard button for role admin', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'admin' } },
    });

    render(<UnauthorisedPage />);

    expect(screen.queryByText('Go to Your Dashboard')).not.toBeInTheDocument();
  });

  /**
   * Pending users must not see the dashboard button — their account isn't approved yet
   */
  it('does not show Go to Your Dashboard button for role pending', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'pending' } },
    });

    render(<UnauthorisedPage />);

    expect(screen.queryByText('Go to Your Dashboard')).not.toBeInTheDocument();
  });

  /**
   * When there is no session at all the dashboard button should not appear
   */
  it('does not show Go to Your Dashboard button when there is no session', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    expect(screen.queryByText('Go to Your Dashboard')).not.toBeInTheDocument();
  });

  // ─── Button click behaviour ────────────────────────────────────────────────

  /**
   * Clicking Go Back should call router.back()
   */
  it('calls router.back() when Go Back is clicked', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    fireEvent.click(screen.getByText('Go Back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  /**
   * Clicking Go to Your Dashboard should push to /user/dashboard
   */
  it('navigates to /user/dashboard when Go to Your Dashboard is clicked', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'staff' } },
    });

    render(<UnauthorisedPage />);

    fireEvent.click(screen.getByText('Go to Your Dashboard'));

    expect(mockPush).toHaveBeenCalledWith('/user/dashboard');
  });

  /**
   * Clicking Return to Login should call signOut with callbackUrl '/login'
   */
  it('calls signOut with callbackUrl /login when Return to Login is clicked', async () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    fireEvent.click(screen.getByText('Return to Login'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
    });
  });
});
