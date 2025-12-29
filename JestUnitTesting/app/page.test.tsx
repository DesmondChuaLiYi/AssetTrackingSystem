import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession as useNextAuthSession, signIn, signOut } from 'next-auth/react';
import LoginPage from '@/app/page';
import { useSession } from '@/components/sessionProvider';
import { useToast } from '@/components/ui/toast';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@/components/SessionProvider', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockShowToast = jest.fn();
  const mockStartSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace
    });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  });

  it('renders login page with Microsoft sign in button', () => {
    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    render(<LoginPage />);

    expect(screen.getByText('Asset Tracking System')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
    expect(screen.getByText('Register for Access')).toBeInTheDocument();
  });

  it('shows loading state when session is loading', () => {
    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    });
    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    render(<LoginPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows loading state when sessionProvider is loading', () => {
    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: true,
    });

    render(<LoginPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('calls signIn when Microsoft sign in button is clicked', () => {
    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    render(<LoginPage />);

    const signInButton = screen.getByText('Sign in with Microsoft');
    fireEvent.click(signInButton);

    expect(signIn).toHaveBeenCalledWith('azure-ad', { callbackUrl: '/admin/dashboard' });
  });

  it('redirects admin to admin dashboard after successful login', async () => {
    const mockStaff = {
      staff_id: 'S001',
      name: 'Admin User',
      email: '104385730@students.swinburne.edu.my',
      role: 'admin',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, staff: mockStaff }),
    });

    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: '104385730@students.swinburne.edu.my',
          microsoftUserId: 'test-ms-id',
        },
      },
      status: 'authenticated',
    });

    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('redirects staff to user dashboard after successful login', async () => {
    const mockStaff = {
      staff_id: 'S002',
      name: 'Staff User',
      email: 'staff@example.com',
      role: 'staff',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, staff: mockStaff }),
    });

    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: 'staff@example.com',
          microsoftUserId: 'test-ms-id',
        },
      },
      status: 'authenticated',
    });

    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user/dashboard');
    });
  });

  it('shows error toast when login fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: 'User not registered'
      }),
    });

    // Mock signOut to change status to unauthenticated to prevent infinite loop
    (signOut as jest.Mock).mockImplementation(async () => {
      (useNextAuthSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });
    });

    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: 'unregistered@example.com',
          microsoftUserId: 'test-ms-id',
        },
      },
      status: 'authenticated',
    });

    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('User not registered', 'error');
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    }, { timeout: 25000 });
  }, 30000);

  it('handles network errors during login', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: 'test@example.com',
          microsoftUserId: 'test-ms-id',
        },
      },
      status: 'authenticated',
    });

    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('An error occurred during login', 'error');
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    });

    consoleError.mockRestore();
  });

  it('redirects to admin dashboard if already logged in as admin', async () => {
    const mockSession = {
      staff_id: 'S001',
      name: 'Admin User',
      email: '104385730@students.swinburne.edu.my',
      role: 'admin',
    };

    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: '104385730@students.swinburne.edu.my',
          microsoftUserId: 'test-ms-id',
        },
      },
      status: 'authenticated',
    });

    (useSession as jest.Mock).mockReturnValue({
      session: mockSession,
      startSession: mockStartSession,
      isLoading: false,
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('redirects to user dashboard if already logged in as staff', async () => {
    const mockSession = {
      staff_id: 'S002',
      name: 'Staff User',
      email: 'staff@example.com',
      role: 'staff',
    };

    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: 'staff@example.com',
          microsoftUserId: 'test-ms-id',
        },
      },
      status: 'authenticated',
    });

    (useSession as jest.Mock).mockReturnValue({
      session: mockSession,
      startSession: mockStartSession,
      isLoading: false,
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/user/dashboard');
    });
  });

  it('clears old session data when unauthenticated', () => {
    const mockSession = {
      staff_id: 'S001',
      name: 'Old User',
      email: 'old@example.com',
      role: 'staff',
    };

    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    (useSession as jest.Mock).mockReturnValue({
      session: mockSession,
      startSession: mockStartSession,
      isLoading: false,
    });

    render(<LoginPage />);

    expect(removeItemSpy).toHaveBeenCalledWith('userSession');

    removeItemSpy.mockRestore();
  });

  it('renders registration link', () => {
    (useNextAuthSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    (useSession as jest.Mock).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      isLoading: false,
    });

    render(<LoginPage />);

    const registerLink = screen.getByText('Register for Access');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });
});
