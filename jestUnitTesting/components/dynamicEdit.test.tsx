/**
 * Unit tests for the dynamicEdit component
 *
 * This component fetches an existing record, populates the form, 
 * handles live client-side validation, and submits a PUT request to update it.
 *
 * What we cover:
 *   - Auth checking (redirects to / if unauthenticated)
 *   - Fetches the existing record from the API on mount
 *   - Fetches related location/department data for dropdowns
 *   - Defaulting the condition to 'In-use' if missing on an asset
 *   - Client-side validation (Strict Regex, Level Regex, etc.)
 *   - Ensuring disabled/primaryKey fields are actually disabled
 *   - Stripping nested objects (e.g., `location: {...}`) before the PUT request
 *   - Form submission behavior (PUT request formatting, success redirects)
 *   - Cancel button behavior
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Split imports as requested
import DynamicEdit from '@/components/dynamicEdit';
import type { dynamicEditConfig } from '@/components/dynamicEdit';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock Breadcrumb
jest.mock('@/components/ui/breadcrumb', () => {
  return function MockBreadcrumb() {
    return <div data-testid="breadcrumb">Breadcrumb</div>;
  };
});

// Mock fetch and alert
global.fetch = jest.fn();
global.alert = jest.fn();

// --- Test Data Configurations ---

const mockEditAssetConfig: dynamicEditConfig = {
  entityName: 'asset',
  entityDisplayName: 'Assets',
  entityDisplayNameSingular: 'Asset',
  apiEndpoint: '/api/assets',
  primaryKey: 'asset_id',
  pageTitle: 'Edit Asset',
  backUrl: '/admin/assets',
  formFields: [
    { key: 'asset_id', label: 'Asset ID', type: 'text', required: true, maxLength: 30 }, // Should be disabled because it's PK
    { key: 'name', label: 'Name', type: 'text', required: true, maxLength: 50 },
    { key: 'category', label: 'Category', type: 'text', required: true, maxLength: 50, disabled: true }, // Explicitly disabled
    { key: 'condition', label: 'Condition', type: 'select', options: [{ value: 'In-use', label: 'In-use' }, { value: 'Spoiled', label: 'Spoiled' }] },
    { key: 'location_id', label: 'Location', type: 'select' },
    { key: 'level', label: 'Level', type: 'text' },
  ],
};

const mockRecordId = 'A100';

describe('dynamicEdit Component', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    
    // Default fetch mock
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      // 1. Mock Related Data: Locations
      if (url.includes('/api/location')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ location_id: 'L1', name: 'Server Room' }] }) });
      }
      // 2. Mock Related Data: Departments
      if (url.includes('/api/department')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ department_id: 'D1', name: 'IT Dept' }] }) });
      }
      // 3. Mock the Existing Record Fetch (GET)
      if (url.includes(`/api/assets/${mockRecordId}`)) {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve({ 
            success: true, 
            data: { 
              asset_id: 'A100', 
              name: 'Old Laptop',
              category: 'Hardware',
              condition: '', // Leave empty to test the 'In-use' fallback
              location_id: 'L1',
              // Include a nested object to ensure handleSubmit cleans it up before PUT
              location: { name: 'Server Room' }, 
              department: { name: 'IT Dept' }
            } 
          }) 
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  // ─── Auth & Loading States ──────────────────────────────────────────────────

  it('renders nothing while session is loading', () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'loading' });
    const { container } = render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('redirects to / and renders nothing if unauthenticated', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' });
    const { container } = render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />);
    
    expect(container).toBeEmptyDOMElement();
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('shows a loading spinner while fetching the record data', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    
    // Do not wait for the promise to resolve to catch the loading state
    render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // ─── Rendering & Initialization ──────────────────────────────────────────────

  it('fetches record and populates the form on mount', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    
    await act(async () => { render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />); });

    // Wait for the loading state to finish and form to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Asset/i })).toBeInTheDocument();
    });

    // Check if the form populated correctly
    expect(screen.getByDisplayValue('A100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Old Laptop')).toBeInTheDocument();
    
    // Because condition was '' in the mock, it should fallback to 'In-use'
    expect(screen.getByDisplayValue('In-use')).toBeInTheDocument();
    
    // Check if related data populated the dropdown
    expect(screen.getByText('Server Room')).toBeInTheDocument();
  });

  it('alerts and redirects if the record fails to load', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    
    // Override the record fetch to simulate a failure
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(`/api/assets/${mockRecordId}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) }); // Failed response
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    await act(async () => { render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />); });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error loading record');
      expect(mockPush).toHaveBeenCalledWith('/admin/assets');
    });
  });

  // ─── Form Behavior & Validation ─────────────────────────────────────────────

  it('disables the primary key field and explicitly disabled fields', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    await act(async () => { render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />); });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Asset/i })).toBeInTheDocument();
    });

    // Primary key should be disabled automatically
    const assetIdInput = document.getElementById('asset_id') as HTMLInputElement;
    expect(assetIdInput).toBeDisabled();

    // Category was explicitly marked as disabled: true in the config
    const categoryInput = document.getElementById('category') as HTMLInputElement;
    expect(categoryInput).toBeDisabled();

    // Name should be editable
    const nameInput = document.getElementById('name') as HTMLInputElement;
    expect(nameInput).not.toBeDisabled();
  });

  it('shows strict validation error when typing special characters in text fields', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    await act(async () => { render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />); });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Asset/i })).toBeInTheDocument();
    });

    const nameInput = document.getElementById('name') as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Hacked@Name!' } });
    });

    expect(screen.getByText(/Contains sensitive special characters/i)).toBeInTheDocument();
    
    // Ensure submit is disabled
    const submitButton = screen.getByRole('button', { name: /Save Asset/i });
    expect(submitButton).toBeDisabled();
  });

  // ─── Form Submission ────────────────────────────────────────────────────────

  it('cleans nested objects and submits a PUT request successfully', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    
    // Override fetch to handle the PUT request
    (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
      if (options?.method === 'PUT') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      if (url.includes(`/api/assets/${mockRecordId}`)) {
        return { ok: true, json: async () => ({ success: true, data: { asset_id: 'A100', name: 'Laptop', location: { name: 'Server Room' } } }) };
      }
      return { ok: true, json: async () => ({ data: [] }) };
    });

    await act(async () => { render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />); });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Asset/i })).toBeInTheDocument();
    });

    const nameInput = document.getElementById('name') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Updated Laptop' } });
    });

    const submitButton = screen.getByRole('button', { name: /Save Asset/i });
    expect(submitButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check that PUT was called
    expect(global.fetch).toHaveBeenCalledWith(`/api/assets/${mockRecordId}`, expect.objectContaining({
      method: 'PUT',
    }));

    // Verify the body was cleaned! Nested 'location' object should be stripped out
    const fetchCall = (global.fetch as jest.Mock).mock.calls.find(call => call[1]?.method === 'PUT');
    const requestBody = JSON.parse(fetchCall[1].body);
    
    expect(requestBody.name).toBe('Updated Laptop');
    expect(requestBody.location).toBeUndefined(); // Crucial: nested object removed
    
    expect(global.alert).toHaveBeenCalledWith('Asset updated successfully!');
    expect(mockPush).toHaveBeenCalledWith('/admin/assets');
  });

  // ─── Buttons ───────────────────────────────────────────────────────────────

  it('navigates back when Cancel is clicked', async () => {
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    await act(async () => { render(<DynamicEdit config={mockEditAssetConfig} recordId={mockRecordId} />); });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Asset/i })).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockPush).toHaveBeenCalledWith('/admin/assets');
  });
});