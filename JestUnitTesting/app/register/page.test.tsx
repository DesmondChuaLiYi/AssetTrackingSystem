import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import RegisterPage from '@/app/(auth)/register/page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));

jest.mock('next/link', () => {
  return ({ children, href }: any) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock fetch, alert, and setTimeout
global.fetch = jest.fn();
global.alert = jest.fn();
jest.useFakeTimers();

describe('RegisterPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders registration page with all form fields', () => {
    render(<RegisterPage />);

    expect(screen.getByText('Staff Registration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., john@swin.edu.my')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 0123456789')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., IT Department')).toBeInTheDocument();
    expect(screen.getByText('Submit Registration')).toBeInTheDocument();
  });

  it('renders back to login link', () => {
    render(<RegisterPage />);

    const backLink = screen.getByText('← Back to Login');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('handles form input changes', () => {
    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText('e.g., John Doe');
    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    const mobileInput = screen.getByPlaceholderText('e.g., 0123456789');
    const departmentInput = screen.getByPlaceholderText('e.g., IT Department');

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@swin.edu.my' } });
    fireEvent.change(mobileInput, { target: { value: '0123456789' } });
    fireEvent.change(departmentInput, { target: { value: 'IT' } });

    expect(nameInput).toHaveValue('Test User');
    expect(emailInput).toHaveValue('test@swin.edu.my');
    expect(mobileInput).toHaveValue('0123456789');
    expect(departmentInput).toHaveValue('IT');
  });

  it('shows validation alert when submitting empty form', async () => {
    render(<RegisterPage />);

    const form = screen.getByText('Submit Registration').closest('form');

    await act(async () => {
      if (form) {
        fireEvent.submit(form);
      }
    });

    expect(global.alert).toHaveBeenCalledWith('All fields are required!');
  });

  it('successfully submits registration', async () => {
    const mockResponse = {
      success: true,
      staff: {
        staff_id: 'S001',
        name: 'Test User',
        email: 'test@swin.edu.my',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<RegisterPage />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), {
      target: { value: 'test@swin.edu.my' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), {
      target: { value: '0123456789' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., IT Department'), {
      target: { value: 'IT' },
    });

    const submitButton = screen.getByText('Submit Registration');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Registration submitted successfully!')
      );
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Your Staff ID: S001')
      );
    });
  });

  it('redirects to login after successful registration', async () => {
    const mockResponse = {
      success: true,
      staff: {
        staff_id: 'S001',
        name: 'Test User',
        email: 'test@swin.edu.my',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<RegisterPage />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), {
      target: { value: 'test@swin.edu.my' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), {
      target: { value: '0123456789' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., IT Department'), {
      target: { value: 'IT' },
    });

    const submitButton = screen.getByText('Submit Registration');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalled();
    });

    // Fast-forward timers
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('clears form after successful registration', async () => {
    const mockResponse = {
      success: true,
      staff: {
        staff_id: 'S001',
        name: 'Test User',
        email: 'test@swin.edu.my',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText('e.g., John Doe');
    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    const mobileInput = screen.getByPlaceholderText('e.g., 0123456789');
    const departmentInput = screen.getByPlaceholderText('e.g., IT Department');

    // Fill in the form
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@swin.edu.my' } });
    fireEvent.change(mobileInput, { target: { value: '0123456789' } });
    fireEvent.change(departmentInput, { target: { value: 'IT' } });

    const submitButton = screen.getByText('Submit Registration');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(emailInput).toHaveValue('');
      expect(mobileInput).toHaveValue('');
      expect(departmentInput).toHaveValue('');
    });
  });

  it('handles API error during registration', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false, error: 'Email already registered' }),
    });

    render(<RegisterPage />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), {
      target: { value: 'test@swin.edu.my' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), {
      target: { value: '0123456789' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., IT Department'), {
      target: { value: 'IT' },
    });

    const submitButton = screen.getByText('Submit Registration');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Registration failed: Email already registered');
    });
  });

  it('handles network error during registration', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<RegisterPage />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), {
      target: { value: 'test@swin.edu.my' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), {
      target: { value: '0123456789' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., IT Department'), {
      target: { value: 'IT' },
    });

    const submitButton = screen.getByText('Submit Registration');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to submit registration. Please try again.');
      expect(consoleError).toHaveBeenCalledWith('Registration error:', expect.any(Error));
    });

    consoleError.mockRestore();
  });

  it('disables submit button while submitting', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<RegisterPage />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), {
      target: { value: 'test@swin.edu.my' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), {
      target: { value: '0123456789' } ,
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., IT Department'), {
      target: { value: 'IT' },
    });

    const submitButton = screen.getByText('Submit Registration');

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      const submittingButton = screen.getByText('Submitting...');
      expect(submittingButton).toBeDisabled();
    });
  });

  it('shows note about admin approval', () => {
    render(<RegisterPage />);

    expect(
      screen.getByText(/After submitting your registration, an administrator will review and approve your request/i)
    ).toBeInTheDocument();
  });

  it('shows email helper text', () => {
    render(<RegisterPage />);

    expect(screen.getByText('Use your Swinburne email address')).toBeInTheDocument();
  });

  it('marks all fields as required', () => {
    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText('e.g., John Doe');
    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    const mobileInput = screen.getByPlaceholderText('e.g., 0123456789');
    const departmentInput = screen.getByPlaceholderText('e.g., IT Department');

    expect(nameInput).toBeRequired();
    expect(emailInput).toBeRequired();
    expect(mobileInput).toBeRequired();
    expect(departmentInput).toBeRequired();
  });

  it('validates email field type', () => {
    render(<RegisterPage />);

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('validates mobile field type', () => {
    render(<RegisterPage />);

    const mobileInput = screen.getByPlaceholderText('e.g., 0123456789');
    expect(mobileInput).toHaveAttribute('type', 'tel');
  });
});
