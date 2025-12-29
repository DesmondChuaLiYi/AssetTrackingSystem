import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfirmationContent from '@/components/scanner/confirmationContext';
import '@testing-library/jest-dom';

// --- 1. MOCK SUPABASE ---
// We create a fake Supabase client that always returns success
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

// This mocks the "@/lib/supabase" import
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle
        })
      }),
      insert: mockInsert,
      update: mockUpdate.mockReturnValue({
        eq: jest.fn() // needed for update chain
      })
    })
  }
}));

// --- 2. START TESTS ---
describe('ConfirmationContent Component', () => {
  // Reset mocks before each test so they are clean
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST CASE 1: REGISTERING A NEW ASSET
  it('shows registration form when asset is not found', async () => {
    // Setup the mock to return an error (simulating "Not Found")
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' }
    });

    // Fake props
    const mockOnBack = jest.fn();
    const mockOnSubmit = jest.fn();
    const mockOnCreate = jest.fn();

    render(
      <ConfirmationContent
        item={{ code: 'NEW-ASSET-123' }}
        tableName="asset"
        onBack={mockOnBack}
        onSubmit={mockOnSubmit}
        onCreate={mockOnCreate}
        parentScan={null}
      />
    );

    // FIX: Wait for the heading specifically
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Register New Asset/i })).toBeInTheDocument();
    });

    expect(screen.getByText('NEW-ASSET-123')).toBeInTheDocument();
  });



  // TEST CASE 2: SUBMITTING A NEW ASSET
  it('validates form and calls onCreate when registering', async () => {
    // Setup mock to fail finding the asset (trigger register mode)
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' }
    });

    const mockOnCreate = jest.fn();

    render(
      <ConfirmationContent
        item={{ code: 'NEW-ASSET-123' }}
        tableName="asset"
        onBack={jest.fn()}
        onSubmit={jest.fn()}
        onCreate={mockOnCreate}
        parentScan={null}
      />
    );

    // Wait for form to load
    // FIX: Wait for the heading specifically
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Register New Asset/i })).toBeInTheDocument()
    );

    // OR, even better, look for the heading specifically:
    // await waitFor(() => screen.getByRole('heading', { name: /Register New Asset/i }));

    // 1. Try to click submit without filling inputs
    const submitBtn = screen.getByRole('button', { name: /Register New Asset/i });
    fireEvent.click(submitBtn);

    // Expect alert (window.alert needs mocking in real apps, but here onCreate should NOT be called)
    expect(mockOnCreate).not.toHaveBeenCalled();

    // 2. Fill in the inputs
    // Note: We use getByPlaceholderText or getByLabelText based on your HTML
    const nameInput = screen.getByPlaceholderText(/e.g., Dell Latitude/i);
    const categoryInput = screen.getByPlaceholderText(/e.g., Laptop, Furniture/i);
    const modelInput = screen.getByPlaceholderText(/e.g., Latitude 5420/i);

    fireEvent.change(nameInput, { target: { value: 'My Test Laptop' } });
    fireEvent.change(categoryInput, { target: { value: 'IT Equipment' } });
    fireEvent.change(modelInput, { target: { value: 'XPS 15' } });

    // 3. Click submit again
    fireEvent.click(submitBtn);

    // 4. Check if onCreate was called with the right data
    expect(mockOnCreate).toHaveBeenCalledWith({
      name: 'My Test Laptop',
      category: 'IT Equipment',
      model: 'XPS 15',
      description: '',
      condition: 'In-use', // default condition
      location_id: null,
      department_id: null
    });
  });

  // TEST CASE 3: EDITING AN EXISTING ASSET
  it('loads existing data and calls onSubmit when editing', async () => {
    // Setup mock to RETURN data (simulating "Found")
    mockSingle.mockResolvedValueOnce({
      data: {
        asset_id: 'EXISTING-1',
        name: 'Old Laptop',
        category: 'Tech',
        model: 'V1',
        condition: 'broken'
      },
      error: null
    });

    const mockOnSubmit = jest.fn();

    render(
      <ConfirmationContent
        item={{ code: 'EXISTING-1' }}
        tableName="asset"
        onBack={jest.fn()}
        onSubmit={mockOnSubmit}
        onCreate={jest.fn()}
        parentScan={null}
      />
    );

    // Wait for the "Confirm Asset" text (Edit Mode title)
    await waitFor(() => {
      expect(screen.getByText('Confirm Asset')).toBeInTheDocument();
    });

    // Check if existing name is displayed
    expect(screen.getByText('Old Laptop')).toBeInTheDocument();

    // Click Submit
    const submitBtn = screen.getByRole('button', { name: /Submit Changes/i });
    fireEvent.click(submitBtn);

    // Verify onSubmit was called
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});