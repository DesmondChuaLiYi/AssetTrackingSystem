import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/navbar/navBar';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/components/LogoutButton', () => {
  return function MockLogoutButton({ className, text }: any) {
    return <button className={className}>{text}</button>;
  };
});

// Mock the Sidebar component with correct path
jest.mock('@/components/navbar/sideBar', () => ({
  __esModule: true,
  default: function MockSidebar({ isOpen }: any) {
    return <div data-testid="sidebar">Sidebar {isOpen ? 'Open' : 'Closed'}</div>;
  }
}));

describe('Navbar', () => {
  const mockSetSidebarOpen = jest.fn();
  const mockSession = {
    user: {
      name: 'Test User',
      email: 'test@example.com',
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/admin/dashboard');
    (useSession as jest.Mock).mockReturnValue({ data: mockSession });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('renders navbar with logo and user info', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />);
    });

    expect(screen.getByAltText('Swinburne Logo')).toBeInTheDocument();
    expect(screen.getByAltText('user photo')).toBeInTheDocument();
  });

  it('toggles sidebar when hamburger button is clicked', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />);
    });

    const hamburgerButton = screen.getByLabelText('Toggle sidebar');

    await act(async () => {
      fireEvent.click(hamburgerButton);
    });

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('opens profile dropdown when profile button is clicked', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />);
    });

    const profileButton = screen.getAllByRole('button')[1];

    await act(async () => {
      fireEvent.click(profileButton);
    });

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('displays user name and email in profile dropdown', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />);
    });

    const profileButton = screen.getAllByRole('button')[1];

    await act(async () => {
      fireEvent.click(profileButton);
    });

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('closes profile dropdown on navigation', async () => {
    let rerender: any;

    await act(async () => {
      const result = render(
        <Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />
      );
      rerender = result.rerender;
    });

    const profileButton = screen.getAllByRole('button')[1];

    await act(async () => {
      fireEvent.click(profileButton);
    });

    expect(screen.getByText('Profile')).toBeInTheDocument();

    (usePathname as jest.Mock).mockReturnValue('/profile');

    await act(async () => {
      rerender(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  it('detects mobile view correctly', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    await act(async () => {
      render(<Navbar sidebarOpen={true} setSidebarOpen={mockSetSidebarOpen} />);
    });

    const overlay = document.querySelector('.fixed.inset-0.z-30');
    expect(overlay).toBeInTheDocument();
  });

  it('handles missing session gracefully', async () => {
    (useSession as jest.Mock).mockReturnValue({ session: null });

    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />);
    });

    const profileButton = screen.getAllByRole('button')[1];

    await act(async () => {
      fireEvent.click(profileButton);
    });

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('No email available')).toBeInTheDocument();
  });

  it('closes sidebar on mobile when profile is opened', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    await act(async () => {
      render(<Navbar sidebarOpen={true} setSidebarOpen={mockSetSidebarOpen} />);
    });

    const profileButton = screen.getAllByRole('button')[1];

    await act(async () => {
      fireEvent.click(profileButton);
    });

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('toggles profile dropdown state', async () => {
    await act(async () => {
      render(<Navbar sidebarOpen={false} setSidebarOpen={mockSetSidebarOpen} />);
    });

    const profileButton = screen.getAllByRole('button')[1];

    // Open dropdown
    await act(async () => {
      fireEvent.click(profileButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    // Close dropdown
    await act(async () => {
      fireEvent.click(profileButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });
});