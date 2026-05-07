/**
 * Unit tests for the Login page (LoginClient component)
 *
 * The login page is split into a server component (page.tsx) and a client
 * component (loginClient.tsx). Since Jest runs in jsdom (no server components),
 * we test LoginClient directly — that is where all the real logic lives.
 *
 * What we cover:
 *  - Renders the sign-in UI correctly
 *  - Shows a loading spinner while NextAuth session is loading
 *  - Calls signIn('azure-ad') when the button is clicked
 *  - Redirects admin to /admin/dashboard after login
 *  - Redirects staff to /user/dashboard after login
 *  - Shows a warning toast for pending accounts
 *  - Shows an error toast for rejected accounts
 *  - Shows a warning toast for unregistered accounts
 *  - Stores loginSuccess in sessionStorage before redirecting
 *  - Does NOT redirect when status is unauthenticated
 *  - Does NOT redirect a second time if the effect already ran
 *  - Registration link points to /register
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import LoginClient from '@/app/(auth)/login/loginClient';

// mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
}));

// mock the toast hook
jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}));

describe('LoginClient', () => {
  const mockPush = jest.fn();
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });

    // clear sessionStorage between tests
    sessionStorage.clear();
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  /**
   * Make sure the login UI elements are all present for an unauthenticated user
   */
  it('renders login page with Microsoft sign in button', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<LoginClient />);

    expect(screen.getByText('Asset Tracking System')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
    expect(screen.getByText('Register for Access')).toBeInTheDocument();
  });

  /**
   * While NextAuth is checking the session it returns status='loading' —
   * we should show the loading spinner, not the sign-in button
   */
  it('shows loading spinner when session status is loading', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });

    render(<LoginClient />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Sign in with Microsoft')).not.toBeInTheDocument();
  });

  /**
   * Register link must point to /register so new users can sign up
   */
  it('renders registration link pointing to /register', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<LoginClient />);

    const registerLink = screen.getByText('Register for Access');
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  // ─── Sign-in button ────────────────────────────────────────────────────────

  /**
   * Clicking the Microsoft button should trigger NextAuth's signIn with azure-ad provider
   */
  it('calls signIn with azure-ad when the Microsoft button is clicked', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<LoginClient />);

    fireEvent.click(screen.getByText('Sign in with Microsoft'));

    expect(signIn).toHaveBeenCalledWith('azure-ad');
  });

  // ─── Redirect after login ──────────────────────────────────────────────────

  /**
   * An admin user should be pushed to /admin/dashboard after authentication
   */
  it('redirects admin to /admin/dashboard after login', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@example.com', role: 'admin' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  /**
   * A staff user should be pushed to /user/dashboard after authentication
   */
  it('redirects staff to /user/dashboard after login', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Staff', email: 'staff@example.com', role: 'staff' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user/dashboard');
    });
  });

  /**
   * Before redirecting, a loginSuccess flag must be written to sessionStorage
   * so the dashboard can display the welcome toast
   */
  it('stores loginSuccess in sessionStorage before redirecting', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@example.com', role: 'admin' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(sessionStorage.getItem('loginSuccess')).toBe('true');
    });
  });

  /**
   * No redirect should happen for an unauthenticated session
   */
  it('does not redirect when status is unauthenticated', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<LoginClient />);

    expect(mockPush).not.toHaveBeenCalled();
  });

  // ─── Account status toasts ─────────────────────────────────────────────────

  /**
   * Pending accounts should see a warning — they cannot log in yet
   */
  it('shows warning toast for pending accounts', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Pending', email: 'pending@example.com', role: 'pending' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account is pending admin approval',
        'warning'
      );
    });

    // should NOT redirect
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * Rejected accounts should see an error toast and stay on the login page
   */
  it('shows error toast for rejected accounts', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Rejected', email: 'rejected@example.com', role: 'rejected' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account has been rejected',
        'error'
      );
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * Users with a Microsoft account but no staff record should be told to register
   */
  it('shows warning toast for unregistered accounts', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Unknown', email: 'unknown@example.com', role: 'unregistered' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account is not registered in the system. Please register for access',
        'warning'
      );
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  // ─── One-shot redirect guard ───────────────────────────────────────────────

  /**
   * The useRef guard prevents the redirect effect from firing more than once.
   * Re-rendering with the same authenticated session should not call push again.
   */
  it('does not redirect a second time if the component re-renders', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@example.com', role: 'admin' } },
      status: 'authenticated',
    });

    const { rerender } = await act(async () => render(<LoginClient />));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    // rerender with same props — push should still only have been called once
    await act(async () => {
      rerender(<LoginClient />);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
