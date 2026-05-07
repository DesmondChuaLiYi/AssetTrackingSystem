/**
 * Unit tests for the Registration page
 *
 * Key things that changed this semester vs last semester:
 *   - Staff ID field added (digits only, stripped at keystroke, max 30 chars)
 *   - Department changed from a free-text input to a <select> dropdown
 *     populated by GET /api/department/public on mount
 *   - Inline validation errors shown per field as the user types
 *   - Duplicate Staff ID and email checked on blur via API calls
 *   - Submit blocked if any fieldErrors are still set
 *
 * What we cover:
 *   - Renders all form fields including the new Staff ID field
 *   - Department field is a <select>, not a text input
 *   - Department dropdown is populated from the public API on mount
 *   - Back to Login link points to /
 *   - Admin approval note is visible
 *   - Staff ID strips non-digit characters on every keystroke
 *   - Staff ID does not allow letters to be typed
 *   - Staff ID shows inline error when a URL/link is typed (non-digits)
 *   - Email strips sensitive characters (<>"'`;\\) on every keystroke
 *   - Email shows inline error for invalid format
 *   - Submit blocked and shows "All fields are required!" when form is empty
 *   - Submit blocked and shows "Please fix the errors" when field errors exist
 *   - Duplicate Staff ID error shown on blur via /api/auth/check-staff-id
 *   - Duplicate email error shown on blur via /api/auth/check-email
 *   - Successful submission shows alert with Staff ID and clears form
 *   - Redirects to / after 2 seconds on success
 *   - Submit button changes to "Submitting..." and is disabled while in-flight
 *   - API error (success: false) shows alert with the error message
 *   - Network error shows fallback alert
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import RegisterPage from '@/app/(auth)/register/page';

// mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

global.fetch = jest.fn();
global.alert = jest.fn();
jest.useFakeTimers();

// mock department list returned by /api/department/public
const mockDepartments = [
  { department_id: 'IT', name: 'Information Technology' },
  { department_id: 'HR', name: 'Human Resources' },
];

describe('RegisterPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    // default: /api/department/public returns the mock list
    // /api/auth/check-staff-id and /api/auth/check-email return no conflict
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/check-staff-id')) {
        return Promise.resolve({ json: () => Promise.resolve({ exists: false }) });
      }
      if (url.includes('/api/auth/check-email')) {
        return Promise.resolve({ json: () => Promise.resolve({ message: null }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, staff: { staff_id: 'S001' } }) });
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────

  /**
   * All required form fields should be visible when the page loads
   */
  it('renders all form fields including the new Staff ID field', async () => {
    await act(async () => { render(<RegisterPage />); });

    expect(screen.getByText('Staff Registration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 12345')).toBeInTheDocument();      // Staff ID
    expect(screen.getByPlaceholderText('e.g., John Doe')).toBeInTheDocument();   // Name
    expect(screen.getByPlaceholderText('e.g., john@swin.edu.my')).toBeInTheDocument(); // Email
    expect(screen.getByPlaceholderText('e.g., 0123456789')).toBeInTheDocument(); // Mobile
    expect(screen.getByRole('combobox')).toBeInTheDocument();                    // Department select
    expect(screen.getByText('Submit Registration')).toBeInTheDocument();
  });

  /**
   * Department must be a <select> dropdown, not a text input
   */
  it('renders department field as a select dropdown, not a text input', async () => {
    await act(async () => { render(<RegisterPage />); });

    const select = screen.getByRole('combobox');
    expect(select.tagName).toBe('SELECT');
  });

  /**
   * The dropdown should be populated with departments from /api/department/public
   */
  it('populates department dropdown from the public API on mount', async () => {
    await act(async () => { render(<RegisterPage />); });

    await waitFor(() => {
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
      expect(screen.getByText('Human Resources')).toBeInTheDocument();
    });
  });

  /**
   * The default "Select a department" placeholder option must be present
   */
  it('shows Select a department as the default dropdown option', async () => {
    await act(async () => { render(<RegisterPage />); });

    expect(screen.getByText('Select a department')).toBeInTheDocument();
  });

  /**
   * Back to Login link must point to / (the root login route)
   */
  it('renders Back to Login link pointing to /', async () => {
    await act(async () => { render(<RegisterPage />); });

    const link = screen.getByText('← Back to Login');
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });

  /**
   * Admin approval note should always be visible on the form
   */
  it('shows the admin approval note', async () => {
    await act(async () => { render(<RegisterPage />); });

    expect(screen.getByText(/an administrator will review and approve/i)).toBeInTheDocument();
  });

  /**
   * Staff ID hint text about digits only should be visible
   */
  it('shows digits-only hint text under Staff ID field', async () => {
    await act(async () => { render(<RegisterPage />); });

    expect(screen.getByText(/Digits only/i)).toBeInTheDocument();
  });

  // ─── Staff ID input behaviour ──────────────────────────────────────────────

  /**
   * Letters typed in the Staff ID field must be stripped immediately —
   * the input should only hold the digit portion
   */
  it('strips letters from Staff ID on every keystroke', async () => {
    await act(async () => { render(<RegisterPage />); });

    const staffIdInput = screen.getByPlaceholderText('e.g., 12345');
    fireEvent.change(staffIdInput, { target: { value: 'abc123' } });

    // only the digits '123' should remain
    expect(staffIdInput).toHaveValue('123');
  });

  /**
   * Pasting a URL (common injection attempt) into Staff ID should result
   * in an empty field because URLs contain no digits at the start and
   * are entirely stripped
   */
  it('results in empty field when a URL is typed in Staff ID', async () => {
    await act(async () => { render(<RegisterPage />); });

    const staffIdInput = screen.getByPlaceholderText('e.g., 12345');
    fireEvent.change(staffIdInput, { target: { value: 'https://evil.com' } });

    // only digits survive — 'https://evil.com' has no digits so value is empty
    expect(staffIdInput).toHaveValue('');
  });

  /**
   * A purely numeric Staff ID should be accepted without any error
   */
  it('accepts a valid numeric Staff ID without errors', async () => {
    await act(async () => { render(<RegisterPage />); });

    const staffIdInput = screen.getByPlaceholderText('e.g., 12345');
    fireEvent.change(staffIdInput, { target: { value: '104385730' } });

    expect(staffIdInput).toHaveValue('104385730');
    expect(screen.queryByText(/Staff ID must/i)).not.toBeInTheDocument();
  });

  // ─── Email input behaviour ─────────────────────────────────────────────────

  /**
   * Sensitive characters in the email field should be stripped on keystroke
   */
  it('strips sensitive characters from email on every keystroke', async () => {
    await act(async () => { render(<RegisterPage />); });

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'test<script>@swin.edu.my' } });

    // < and > are stripped
    expect(emailInput).toHaveValue('testscript@swin.edu.my');
  });

  /**
   * An invalid email format should show an inline error message
   */
  it('shows inline error for invalid email format', async () => {
    await act(async () => { render(<RegisterPage />); });

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });

    expect(screen.getByText('Invalid email format.')).toBeInTheDocument();
  });

  /**
   * A valid email should not show any inline error
   */
  it('does not show email error for a valid email address', async () => {
    await act(async () => { render(<RegisterPage />); });

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'valid@swin.edu.my' } });

    expect(screen.queryByText('Invalid email format.')).not.toBeInTheDocument();
  });

  // ─── Blur duplicate checks ─────────────────────────────────────────────────

  /**
   * If the Staff ID already exists in the DB, the blur handler should show an error
   */
  it('shows error when Staff ID is already registered (on blur)', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/check-staff-id')) {
        return Promise.resolve({ json: () => Promise.resolve({ exists: true }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });

    const staffIdInput = screen.getByPlaceholderText('e.g., 12345');
    fireEvent.change(staffIdInput, { target: { value: '12345' } });

    await act(async () => { fireEvent.blur(staffIdInput); });

    await waitFor(() => {
      expect(screen.getByText('This Staff ID is already registered.')).toBeInTheDocument();
    });
  });

  /**
   * If the email is already registered (or pending), the blur handler shows the
   * message returned by the API
   */
  it('shows error when email is already registered (on blur)', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/check-email')) {
        return Promise.resolve({ json: () => Promise.resolve({ message: 'This email is already registered.' }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false }) });
    });

    await act(async () => { render(<RegisterPage />); });

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'taken@swin.edu.my' } });

    await act(async () => { fireEvent.blur(emailInput); });

    await waitFor(() => {
      expect(screen.getByText('This email is already registered.')).toBeInTheDocument();
    });
  });

  // ─── Submit validation ─────────────────────────────────────────────────────

  /**
   * Submitting an empty form should alert "All fields are required!" without calling the API
   */
  it('shows all fields required alert when form is empty', async () => {
    await act(async () => { render(<RegisterPage />); });

    const form = screen.getByText('Submit Registration').closest('form');
    await act(async () => { if (form) fireEvent.submit(form); });

    expect(global.alert).toHaveBeenCalledWith('All fields are required!');
    // the register API should not be called
    expect(global.fetch).toHaveBeenCalledTimes(1); // only the departments fetch on mount
  });

  /**
   * If there is an active field error the submit handler should block and alert
   * "Please fix the errors before submitting."
   */
  it('blocks submit and alerts when field errors are present', async () => {
    await act(async () => { render(<RegisterPage />); });

    // wait for department dropdown to populate so we can select one
    await waitFor(() => {
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
    });

    // type an invalid email to set a fieldError
    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'bademail' } });

    // fill all other fields so only the email error remains
    fireEvent.change(screen.getByPlaceholderText('e.g., 12345'), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'IT' } });

    const form = screen.getByText('Submit Registration').closest('form');
    await act(async () => { if (form) fireEvent.submit(form); });

    expect(global.alert).toHaveBeenCalledWith('Please fix the errors before submitting.');
  });

  // ─── Successful submission ─────────────────────────────────────────────────

  /**
   * Helper: fill every field with valid data and select a department
   */
  async function fillValidForm() {
    await waitFor(() => {
      // wait for department options to appear before selecting
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g., 12345'), { target: { value: '104385730' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), { target: { value: 'Jun Zhen Wong' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), { target: { value: 'junzhen@swin.edu.my' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'IT' } });
  }

  /**
   * On success the page should alert the success message containing the Staff ID
   */
  it('shows success alert with Staff ID on successful registration', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, staff: { staff_id: '104385730' } }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Registration submitted successfully!')
      );
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('104385730')
      );
    });
  });

  /**
   * After success the form fields should be cleared
   */
  it('clears form fields after successful registration', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, staff: { staff_id: '104385730' } }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., 12345')).toHaveValue('');
      expect(screen.getByPlaceholderText('e.g., John Doe')).toHaveValue('');
      expect(screen.getByPlaceholderText('e.g., john@swin.edu.my')).toHaveValue('');
      expect(screen.getByPlaceholderText('e.g., 0123456789')).toHaveValue('');
    });
  });

  /**
   * After success the page should redirect to / after a 2-second delay
   */
  it('redirects to / after 2 seconds on successful registration', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, staff: { staff_id: '104385730' } }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });
    await waitFor(() => { expect(global.alert).toHaveBeenCalled(); });

    act(() => { jest.advanceTimersByTime(2000); });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  // ─── Submit button state ───────────────────────────────────────────────────

  /**
   * While the registration fetch is in-flight the button should show
   * "Submitting..." and be disabled so the user can't double-submit
   */
  it('disables submit button and shows Submitting... while in-flight', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      // register call never resolves — keeps loading state visible
      return new Promise(() => {});
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      const btn = screen.getByText('Submitting...');
      expect(btn).toBeDisabled();
    });
  });

  // ─── Error handling ────────────────────────────────────────────────────────

  /**
   * When the API returns success: false the error message from the response should appear
   */
  it('shows API error message when registration fails', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ success: false, error: 'Email already registered' }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Registration failed: Email already registered');
    });
  });

  /**
   * A network error (fetch throws) should show the fallback alert message
   */
  it('shows fallback alert on network error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to submit registration. Please try again.');
      expect(consoleSpy).toHaveBeenCalledWith('Registration error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
