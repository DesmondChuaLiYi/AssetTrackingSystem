import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ScannerPage from '@/app/(app)/user/scanner/page'; // Import the page component
import '@testing-library/jest-dom';

// ==================================================================
// 1. MOCK NEXT.JS NAVIGATION
// ==================================================================
const mockGet = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// ==================================================================
// 2. MOCK SUPABASE (ROBUST VERSION)
// ==================================================================
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockIlike = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();

// Define the "Terminator" object that ends the chain
const queryTerminator = {
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
};

// Define the "Filter" object that returns the terminator
const queryFilter = {
  eq: mockEq.mockReturnValue(queryTerminator),
  ilike: mockIlike.mockReturnValue(queryTerminator),
  single: mockSingle,       // Direct single() after select()
  maybeSingle: mockMaybeSingle // Direct maybeSingle() after select()
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect.mockReturnValue(queryFilter),
      insert: mockInsert,
      update: mockUpdate.mockReturnValue({ eq: mockEq.mockReturnValue(queryTerminator) }),
      delete: mockDelete.mockReturnValue({ eq: mockEq.mockReturnValue(queryTerminator) }),
    })),
  },
}));

// ==================================================================
// 3. MOCK CHILD COMPONENTS
// ==================================================================

// Mock ScannerContext
jest.mock('@/components/scanner/ScannerContext', () => {
  return function MockScanner({ onItemScanned, title }: any) {
    return (
      <div data-testid="scanner-mock">
        <h1>{title}</h1>
        <button 
          data-testid="trigger-scan"
          onClick={() => onItemScanned({ code: 'TEST-CODE-123' })}
        >
          Simulate Scan
        </button>
      </div>
    );
  };
});

// Mock ConfirmationContent
jest.mock('@/components/scanner/ConfirmationContent', () => {
  return function MockConfirmation({ onSubmit, onCreate }: any) {
    return (
      <div data-testid="confirmation-mock">
        <button onClick={() => onSubmit({ status: 'in use' })}>Confirm Edit</button>
        <button onClick={() => onCreate({ name: 'New Thing', status: 'in use' })}>Confirm Create</button>
      </div>
    );
  };
});

// Mock SuccessContent
jest.mock('@/components/scanner/SuccessContent', () => {
  return function MockSuccess({ scanType }: any) {
    return <div data-testid="success-mock">Success: {scanType}</div>;
  };
});

// ==================================================================
// 4. TESTS
// ==================================================================
describe('ScannerPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue('asset'); // Default to asset scan
    
    // Default successful response to prevent "undefined" errors
    mockSingle.mockResolvedValue({ data: { id: 'default' }, error: null });
  });

  // --- TEST 1: Basic Asset Scan Flow ---
  it('navigates to Confirmation when an asset is scanned', async () => {
    render(<ScannerPage />);

    expect(screen.getByText('Asset Scanner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('trigger-scan'));

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-mock')).toBeInTheDocument();
    });
  });

  // --- TEST 2: Updating an Asset ---
  it('updates asset via Supabase when confirmed', async () => {
    render(<ScannerPage />);

    // 1. Scan
    fireEvent.click(screen.getByTestId('trigger-scan'));
    await waitFor(() => screen.getByTestId('confirmation-mock'));

    // 2. Setup Supabase Mock for UPDATE
    // We ensure the update call returns success
    mockUpdate.mockReturnValue({ 
      eq: jest.fn().mockResolvedValue({ error: null }) 
    });

    // 3. Click "Confirm Edit"
    fireEvent.click(screen.getByText('Confirm Edit'));

    // 4. Expect Supabase to be called
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(screen.getByTestId('success-mock')).toBeInTheDocument();
    });
  });

  // --- TEST 3: Creating a New Asset ---
  it('creates asset via Supabase when registering', async () => {
    render(<ScannerPage />);

    fireEvent.click(screen.getByTestId('trigger-scan'));
    await waitFor(() => screen.getByTestId('confirmation-mock'));

    // Setup Supabase Mock for INSERT
    mockInsert.mockResolvedValue({ error: null });

    fireEvent.click(screen.getByText('Confirm Create'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
      expect(screen.getByText('Success: New Asset Registered')).toBeInTheDocument();
    });
  });

  // --- TEST 4: Location Tagging Logic (The Parent Scan) ---
  it('handles the two-step Location Tagging flow', async () => {
    // 1. Set URL param to 'location'
    mockGet.mockReturnValue('location');
    
    // 2. Setup the Chain of Responses for mockSingle
    // Call 1 (Location Scan): Return valid Location data
    // Call 2 (Asset Scan): Return valid Asset data
    mockSingle
      .mockResolvedValueOnce({ data: { name: 'Warehouse' }, error: null }) // For .ilike()
      .mockResolvedValueOnce({ data: { asset_id: 'ASSET-001' }, error: null }); // For .eq()

    render(<ScannerPage />);
    expect(screen.getByText('Location Scanner')).toBeInTheDocument();

    // 3. STEP 1: Scan the Location
    fireEvent.click(screen.getByTestId('trigger-scan')); 

    // Wait a tick for state update (React needs a moment to process the async scan)
    await waitFor(() => {}); 

    // 4. Setup the UPDATE mock for the final step
    mockUpdate.mockReturnValue({ 
      eq: jest.fn().mockResolvedValue({ error: null }) 
    });

    // 5. STEP 2: Scan the Asset (Simulate clicking scanner again)
    fireEvent.click(screen.getByTestId('trigger-scan'));

    // 6. Expect Supabase to update the asset with location_id
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ location_id: 'TEST-CODE-123' })
      );
      expect(screen.getByTestId('success-mock')).toBeInTheDocument();
    });
  });

  // --- TEST 5: Staff Cart Logic (Irene's Logic) ---
  it('handles Staff scanning and Cart submission', async () => {
    mockGet.mockReturnValue('staff');
    render(<ScannerPage />);

    // Setup mocks for Staff Logic
    mockMaybeSingle.mockResolvedValue({ data: { staff_id: 'STAFF-001', name: 'John Doe' }, error: null });
    
    // Mock the asset count check
    mockSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 5, data: [] }) // data: [] for ownership check later
    });

    // 1. Scan Staff ID
    fireEvent.click(screen.getByTestId('trigger-scan'));

    await waitFor(() => {
      expect(screen.getByText('Staff Confirmed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Continue Scanning'));

    // 2. Scan Asset
    // Reset asset lookup mock
    mockMaybeSingle.mockResolvedValue({ data: { asset_id: 'ASSET-X', name: 'Laptop' }, error: null });
    
    fireEvent.click(screen.getByTestId('trigger-scan'));

    await waitFor(() => {
      expect(screen.getByText('Cart (1)')).toBeInTheDocument();
    });

    // 3. Submit
    mockInsert.mockResolvedValue({ error: null });
    fireEvent.click(screen.getByText(/Submit/i));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
      expect(screen.getByTestId('success-mock')).toBeInTheDocument();
    });
  });
});