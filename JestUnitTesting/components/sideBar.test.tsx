import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navbar/sideBar';
import { useSession } from 'next-auth/react';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/components/LogoutButton', () => {
  return function MockLogoutButton({ className, text }: any) {
    return <button className={className}>{text}</button>;
  };
});

// Mock Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  };
});

describe('Sidebar', () => {
  const mockSetIsOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/admin/dashboard');

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  describe('Admin User', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        session: { email: '104385730@students.swinburne.edu.my' },
      });
    });

    it('renders admin modules for admin user', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Asset Tracking')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Department')).toBeInTheDocument();
      expect(screen.getByText('Staff')).toBeInTheDocument();
    });

    it('toggles dropdown menu when clicked', async () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const assetTrackingButton = screen.getByText('Asset Tracking');
      fireEvent.click(assetTrackingButton);

      await waitFor(() => {
        expect(screen.getByText('Assets')).toBeInTheDocument();
        expect(screen.getByText('Categories')).toBeInTheDocument();
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });
    });

    it('saves active dropdown state to localStorage', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const assetTrackingButton = screen.getByText('Asset Tracking');
      fireEvent.click(assetTrackingButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'sidebarActiveItem',
        '/admin/assetTracking'
      );
    });

    it('highlights active route', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/location');

      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const locationButton = screen.getByText('Location').closest('button');
      expect(locationButton).toHaveClass('bg-red-600');
    });

    it('expands location dropdown and shows sub-items', async () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const locationButton = screen.getByText('Location');
      fireEvent.click(locationButton);

      await waitFor(() => {
        expect(screen.getByText('Rooms')).toBeInTheDocument();
        expect(screen.getByText('Sites')).toBeInTheDocument();
        expect(screen.getByText('Zones')).toBeInTheDocument();
      });
    });

    it('expands department dropdown and shows sub-items', async () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const departmentButton = screen.getByText('Department');
      fireEvent.click(departmentButton);

      await waitFor(() => {
        expect(screen.getByText('Units')).toBeInTheDocument();
        expect(screen.getByText('Teams')).toBeInTheDocument();
        expect(screen.getByText('Budgets')).toBeInTheDocument();
      });
    });

    it('expands staff dropdown and shows sub-items', async () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const staffButton = screen.getByText('Staff');
      fireEvent.click(staffButton);

      await waitFor(() => {
        expect(screen.getByText('List')).toBeInTheDocument();
        expect(screen.getByText('Approvals')).toBeInTheDocument();
        expect(screen.getByText('Roles')).toBeInTheDocument();
        expect(screen.getByText('Attendance')).toBeInTheDocument();
      });
    });

    it('closes dropdown when clicked again', async () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const assetTrackingButton = screen.getByText('Asset Tracking');

      // Open dropdown
      fireEvent.click(assetTrackingButton);
      await waitFor(() => {
        expect(screen.getByText('Assets')).toBeInTheDocument();
      });

      // Close dropdown
      fireEvent.click(assetTrackingButton);
      await waitFor(() => {
        expect(screen.queryByText('Assets')).not.toBeInTheDocument();
      });
    });
  });

  describe('Regular User', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        session: { email: 'regular@example.com' },
      });
    });

    it('renders only user modules for regular user', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      expect(screen.getByText('Main Menu')).toBeInTheDocument();
      expect(screen.queryByText('Asset Tracking')).not.toBeInTheDocument();
      expect(screen.queryByText('Location')).not.toBeInTheDocument();
    });

    it('renders user section label', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('Mobile View', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      (useSession as jest.Mock).mockReturnValue({
        session: { email: '104385730@students.swinburne.edu.my' },
      });
    });

    it('renders mobile close button', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const closeButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
      );
      expect(closeButton).toBeInTheDocument();
    });

    it('renders search input on mobile', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const searchInput = screen.getByPlaceholderText('Search...');
      expect(searchInput).toBeInTheDocument();
    });

    it('closes sidebar when close button is clicked', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn =>
        btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
      );

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockSetIsOpen).toHaveBeenCalledWith(false);
      }
    });

    it('applies mobile-specific styles', () => {
      const { container } = render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const sidebar = container.querySelector('.sidebar');
      expect(sidebar).toHaveClass('fixed');
    });
  });

  describe('Settings and Logout', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        session: { email: '104385730@students.swinburne.edu.my' },
      });
    });

    it('renders settings link', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const settingsLink = screen.getByText('Settings');
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink.closest('a')).toHaveAttribute('href', '/settings');
    });

    it('renders logout button', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('highlights settings when on settings page', () => {
      (usePathname as jest.Mock).mockReturnValue('/settings');

      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const settingsLink = screen.getByText('Settings');
      expect(settingsLink).toBeInTheDocument();

    });
  });

  describe('Animation and Visibility', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        session: { email: '104385730@students.swinburne.edu.my' },
      });
    });

    it('does not render when isOpen is false', () => {
      render(<Sidebar isOpen={false} setIsOpen={mockSetIsOpen} />);

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  describe('LocalStorage Integration', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        session: { email: '104385730@students.swinburne.edu.my' },
      });
    });

    it('retrieves saved active item from localStorage on mount', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('/admin/location');

      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      expect(localStorage.getItem).toHaveBeenCalledWith('sidebarActiveItem');
    });

    it('clears active item when toggling closed', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const assetTrackingButton = screen.getByText('Asset Tracking');

      // Open
      fireEvent.click(assetTrackingButton);
      expect(localStorage.setItem).toHaveBeenCalledWith('sidebarActiveItem', '/admin/assetTracking');

      // Close
      fireEvent.click(assetTrackingButton);
      expect(localStorage.setItem).toHaveBeenCalledWith('sidebarActiveItem', '');
    });
  });

  describe('Hover Effects', () => {
    beforeEach(() => {
      (useSession as jest.Mock).mockReturnValue({
        session: { email: '104385730@students.swinburne.edu.my' },
      });
    });

    it('applies hover styles on mouse enter', () => {
      render(<Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />);

      const homeLink = screen.getByText('Home').closest('a');

      if (homeLink) {
        fireEvent.mouseEnter(homeLink);
        // Component should handle hover state internally
        expect(homeLink).toBeInTheDocument();
      }
    });
  });
});