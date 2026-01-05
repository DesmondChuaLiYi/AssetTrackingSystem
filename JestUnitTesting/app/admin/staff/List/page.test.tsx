import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import StaffListPage from '@/app/(app)/admin/staff/list/page';
import { useAdminAccess } from '@/hooks/useAdminAccess';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
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

jest.mock('@heroicons/react/24/outline', () => ({
  PencilIcon: () => <svg data-testid="pencil-icon">Edit</svg>,
  PlusIcon: () => <svg data-testid="plus-icon">Plus</svg>,
}));

// Mock fetch and alert
global.fetch = jest.fn();
global.alert = jest.fn();
global.scrollTo = jest.fn();

describe('StaffListPage', () => {
  const mockPush = jest.fn();
  const mockSession = {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it('shows loading state when session is loading', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: null,
      isLoading: true,
    });

    render(<StaffListPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders staff management page when session is loaded', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: [] }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    expect(screen.getByText('Staff Management')).toBeInTheDocument();
    expect(screen.getByText('Add New Staff Member')).toBeInTheDocument();
  });

  it('fetches and displays staff list', async () => {
    const mockStaff = [
      {
        staff_id: 'S001',
        name: 'John Doe',
        email: 'john@example.com',
        mobile_no: '0123456789',
        department_id: 'IT',
        microsoft_user_id: 'ms-id-1',
        created_dt: '2024-01-01',
        updated_dt: '2024-01-01',
      },
      {
        staff_id: 'S002',
        name: 'Jane Smith',
        email: 'jane@example.com',
        mobile_no: '0987654321',
        department_id: 'HR',
        microsoft_user_id: 'ms-id-2',
        created_dt: '2024-01-02',
        updated_dt: '2024-01-02',
      },
    ];

    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: mockStaff }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  it('shows empty message when no staff found', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: [] }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('No staff members found')).toBeInTheDocument();
    });
  });

  it('handles form input changes', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: [] }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    const nameInput = screen.getByPlaceholderText('e.g., John Doe');
    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(nameInput).toHaveValue('Test User');
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('shows validation alert when submitting empty form', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: [] }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    const form = screen.getByText('Add Staff').closest('form');

    await act(async () => {
      if (form) {
        fireEvent.submit(form);
      }
    });

    expect(global.alert).toHaveBeenCalledWith('All fields are required!');
  });

  it('successfully adds new staff member', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, staff: [] }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, staff: [] }),
      });

    await act(async () => {
      render(<StaffListPage />);
    });

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('e.g., S001'), { target: { value: 'S003' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), { target: { value: 'New Staff' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), { target: { value: '0111111111' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., IT'), { target: { value: 'IT' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., d5a79a53-4635-4cb7-8b57-3a586f6cb9c9'), { target: { value: 'ms-id-3' } });

    const submitButton = screen.getByText('Add Staff');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Staff added successfully!');
    });
  });

  it('handles edit button click', async () => {
    const mockStaff = [
      {
        staff_id: 'S001',
        name: 'John Doe',
        email: 'john@example.com',
        mobile_no: '0123456789',
        department_id: 'IT',
        microsoft_user_id: 'ms-id-1',
        created_dt: '2024-01-01',
        updated_dt: '2024-01-01',
      },
    ];

    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: mockStaff }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    const editButton = editButtons[editButtons.length - 1]; // Get the last Edit button (the actual button, not SVG)

    await act(async () => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Staff Member')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      expect(global.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
  });

  it('successfully updates staff member', async () => {
    const mockStaff = [
      {
        staff_id: 'S001',
        name: 'John Doe',
        email: 'john@example.com',
        mobile_no: '0123456789',
        department_id: 'IT',
        microsoft_user_id: 'ms-id-1',
        created_dt: '2024-01-01',
        updated_dt: '2024-01-01',
      },
    ];

    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, staff: mockStaff }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, staff: mockStaff }),
      });

    await act(async () => {
      render(<StaffListPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    const editButton = editButtons[editButtons.length - 1];

    await act(async () => {
      fireEvent.click(editButton);
    });

    // Update name
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'John Updated' } });

    const updateButton = screen.getByText('Update Staff');

    await act(async () => {
      fireEvent.click(updateButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Staff updated successfully!');
    });
  });

  it('handles cancel edit button', async () => {
    const mockStaff = [
      {
        staff_id: 'S001',
        name: 'John Doe',
        email: 'john@example.com',
        mobile_no: '0123456789',
        department_id: 'IT',
        microsoft_user_id: 'ms-id-1',
        created_dt: '2024-01-01',
        updated_dt: '2024-01-01',
      },
    ];

    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: mockStaff }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    const editButton = editButtons[editButtons.length - 1];

    await act(async () => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Staff Member')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');

    await act(async () => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Add New Staff Member')).toBeInTheDocument();
      expect(screen.queryByText('Edit Staff Member')).not.toBeInTheDocument();
    });
  });

  it('handles API error during staff submission', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, staff: [] }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Duplicate staff ID' }),
      });

    await act(async () => {
      render(<StaffListPage />);
    });

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('e.g., S001'), { target: { value: 'S001' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), { target: { value: '0111111111' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., IT'), { target: { value: 'IT' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., d5a79a53-4635-4cb7-8b57-3a586f6cb9c9'), { target: { value: 'ms-id' } });

    const submitButton = screen.getByText('Add Staff');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error: Duplicate staff ID');
    });
  });

  it('handles network error during fetch', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<StaffListPage />);
    });

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Error fetching staff:', expect.any(Error));
    });

    consoleError.mockRestore();
  });

  it('disables staff ID field when editing', async () => {
    const mockStaff = [
      {
        staff_id: 'S001',
        name: 'John Doe',
        email: 'john@example.com',
        mobile_no: '0123456789',
        department_id: 'IT',
        microsoft_user_id: 'ms-id-1',
        created_dt: '2024-01-01',
        updated_dt: '2024-01-01',
      },
    ];

    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: mockStaff }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    const editButton = editButtons[editButtons.length - 1];

    await act(async () => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      const staffIdInput = screen.getByDisplayValue('S001');
      expect(staffIdInput).toBeDisabled();
    });
  });

  it('renders breadcrumb with correct items', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, staff: [] }),
    });

    await act(async () => {
      render(<StaffListPage />);
    });

    const breadcrumb = screen.getByTestId('breadcrumb');
    expect(breadcrumb).toBeInTheDocument();
    expect(breadcrumb).toHaveTextContent('Home');
    expect(breadcrumb).toHaveTextContent('Staff');
    expect(breadcrumb).toHaveTextContent('List');
  });
});
