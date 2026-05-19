/**
 * Component Tests: ConfirmationContent
 *
 * Test suite covers:
 *   - Loading state
 *   - Error state (invalid item)
 *   - Editing mode — confirm step
 *   - Editing mode — update step (manual & AI)
 *   - Registering mode (new asset)
 *   - Manual submit validation
 *   - AI analyze flow
 *   - AI submit flow
 *
 * Industry standards followed:
 *   - AAA (Arrange / Act / Assert) pattern
 *   - All external dependencies mocked (fetch, lucide-react)
 *   - No real network calls or AI calls
 *   - userEvent for realistic interactions
 */

import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationContent from '@/components/scanner/confirmationContext';

// ─── Mock lucide-react icons (they are just SVGs, not needed for logic tests) ──
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  CheckCircle: () => <span data-testid="icon-check-circle" />,
  Edit: () => <span data-testid="icon-edit" />,
  AlertCircle: () => <span data-testid="icon-alert-circle" />,
  Save: () => <span data-testid="icon-save" />,
  PackagePlus: () => <span data-testid="icon-package-plus" />,
  MapPin: () => <span data-testid="icon-map-pin" />,
  Building2: () => <span data-testid="icon-building2" />,
  Upload: () => <span data-testid="icon-upload" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
  PenLine: () => <span data-testid="icon-pen-line" />,
  RefreshCw: () => <span data-testid="icon-refresh-cw" />,
}));

// Default props 
const defaultItem = { code: 'ASSET-001' };
const defaultOnBack = jest.fn();
const defaultOnSubmit = jest.fn();
const defaultOnCreate = jest.fn().mockResolvedValue(undefined);

// Mock API responses 
const mockLocations   = [
  { location_id: 'LOC-1', name: 'Block A' },
  { location_id: 'LOC-2', name: 'Block B' },
];
const mockDepartments = [
  { department_id: 'DEPT-1', name: 'IT' },
  { department_id: 'DEPT-2', name: 'HR' },
];
const mockAsset = {
  asset_id: 'ASSET-001',
  name: 'Dell Laptop',
  description: 'Office laptop',
  location_id: 'LOC-1',
  department_id: 'DEPT-1',
  condition: 'In-use',
  category: 'Laptop',
  model: 'Latitude 5420',
};

// Helper: render with default props 
const renderComponent = (overrides = {}) =>
  render(
    <ConfirmationContent
      item={defaultItem}
      tableName="Asset"
      onBack={defaultOnBack}
      onSubmit={defaultOnSubmit}
      onCreate={defaultOnCreate}
      parentScan={null}
      {...overrides}
    />
  );

// Mock fetch for existing asset 
const mockFetchExistingAsset = () => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/location'))
      return Promise.resolve({ json: () => Promise.resolve({ data: mockLocations }) });
    if (url.includes('/api/department'))
      return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
    if (url.includes('/api/scanner'))
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: mockAsset }) });
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
};

// Mock fetch for new asset (not found scenario)
const mockFetchNewAsset = () => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/location'))
      return Promise.resolve({ json: () => Promise.resolve({ data: mockLocations }) });
    if (url.includes('/api/department'))
      return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
    if (url.includes('/api/scanner'))
      return Promise.resolve({ json: () => Promise.resolve({ success: false, data: null }) });
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
};

// SUITE 1 — Loading & Error States
describe('Loading and Error States', () => {

  beforeEach(() => jest.clearAllMocks());

  it('should show loading state initially', () => {
    // Arrange
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves

    // Act
    renderComponent();

    // Assert
    expect(screen.getByText(/searching for asset/i)).toBeInTheDocument();
  });

  it('should show error state when item has no code', async () => {
    // Arrange & Act
    renderComponent({ item: {} });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/invalid asset data/i)).toBeInTheDocument();
    });
  });

  it('should show Back to Scan button in error state', async () => {
    // Arrange & Act
    renderComponent({ item: {} });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/back to scan/i)).toBeInTheDocument();
    });
  });

  it('should call onBack when Back to Scan is clicked in error state', async () => {
    // Arrange
    renderComponent({ item: {} });

    await waitFor(() => screen.getByText(/back to scan/i));

    // Act
    fireEvent.click(screen.getByText(/back to scan/i));

    // Assert
    expect(defaultOnBack).toHaveBeenCalledTimes(1);
  });
});

// SUITE 2 — Editing Mode: Confirm Step

describe('Editing Mode — Confirm Step', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchExistingAsset();
  });

  it('should show Confirm Asset header for existing asset', async () => {
    // Arrange & Act
    renderComponent();

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Confirm Asset')).toBeInTheDocument();
    });
  });

  it('should display asset name and ID', async () => {
    // Arrange & Act
    renderComponent();

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Dell Laptop')).toBeInTheDocument();
      expect(screen.getByText('ASSET-001')).toBeInTheDocument();
    });
  });

  it('should display asset category and model', async () => {
    // Arrange & Act
    renderComponent();

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Latitude 5420')).toBeInTheDocument();
    });
  });

  it('should show Update Asset button on confirm step', async () => {
    // Arrange & Act
    renderComponent();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/update asset/i)).toBeInTheDocument();
    });
  });

  it('should navigate to update step when Update Asset is clicked', async () => {
    // Arrange
    renderComponent();
    await waitFor(() => screen.getByText(/update asset/i));

    // Act
    fireEvent.click(screen.getByText(/update asset/i));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/update asset/i)).toBeInTheDocument();
      expect(screen.getByText(/asset condition/i)).toBeInTheDocument();
    });
  });
});

// SUITE 3 — Editing Mode: Update Step — Manual Assessment
describe('Editing Mode — Update Step: Manual Assessment', () => {

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetchExistingAsset();
  });

  // Helper: render and navigate to update step
  const goToUpdateStep = async () => {
    renderComponent();
    await waitFor(() => screen.getByText(/update asset/i));
    fireEvent.click(screen.getByText(/update asset/i));
    await waitFor(() => screen.getByText(/asset condition/i));
  };

  it('should show Manual and AI Assist toggle buttons', async () => {
    // Arrange & Act
    await goToUpdateStep();

    // Assert
    expect(screen.getByText(/manual/i)).toBeInTheDocument();
    expect(screen.getByText(/ai assist/i)).toBeInTheDocument();
  });

  it('should show condition options: In-use, In-store, Spoiled', async () => {
    // Arrange & Act
    await goToUpdateStep();

    // Assert
    expect(screen.getByText('In-use')).toBeInTheDocument();
    expect(screen.getByText('In-store')).toBeInTheDocument();
    expect(screen.getByText('Spoiled')).toBeInTheDocument();
  });

  it('should show error when submitting without selecting location', async () => {
    // Arrange
    await goToUpdateStep();

    // Act — click submit without selecting location
    fireEvent.click(screen.getByText(/submit manual assessment/i));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/please select a location/i)).toBeInTheDocument();
    });
  });

  it('should show error when maintenance needed but priority is none', async () => {
    // Arrange
    await goToUpdateStep();

    // Select location and department first
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'LOC-1' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'DEPT-1' } });

    // Toggle maintenance to Yes
    fireEvent.click(screen.getByText('Yes'));

    // Act — submit without selecting priority
    fireEvent.click(screen.getByText(/submit manual assessment/i));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/please select a priority level/i)).toBeInTheDocument();
    });
  });

  it('should show error when maintenance needed but feedback is empty', async () => {
    // Arrange
    await goToUpdateStep();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'LOC-1' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'DEPT-1' } });
    fireEvent.click(screen.getByText('Yes')); // maintenance needed
    fireEvent.click(screen.getByText('low')); // select priority

    // Act — submit without feedback
    fireEvent.click(screen.getByText(/submit manual assessment/i));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/please enter staff feedback/i)).toBeInTheDocument();
    });
  });

  it('should call onSubmit with submitType manual on successful submission', async () => {
    // Arrange
    await goToUpdateStep();

    // Mock the save API
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/saveMaintenance'))
        return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'LOC-1' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'DEPT-1' } });
    // No maintenance needed — can submit directly

    // Act
    fireEvent.click(screen.getByText(/submit manual assessment/i));

    // Assert
    await waitFor(() => {
      expect(defaultOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ submitType: 'manual' })
      );
    });
  });

  it('should show error when save API fails', async () => {
    // Arrange
    await goToUpdateStep();

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/saveMaintenance'))
        return Promise.resolve({ json: () => Promise.resolve({ success: false, error: 'DB error' }) });
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'LOC-1' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'DEPT-1' } });

    // Act
    fireEvent.click(screen.getByText(/submit manual assessment/i));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/DB error/i)).toBeInTheDocument();
    });
  });
});

// SUITE 4 — Editing Mode: Update Step — AI Assessment
describe('Editing Mode — Update Step: AI Assessment', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchExistingAsset();
  });

  const goToAiStep = async () => {
    renderComponent();
    await waitFor(() => screen.getByText(/update asset/i));
    fireEvent.click(screen.getByText(/update asset/i));
    await waitFor(() => screen.getByText(/ai assist/i));
    fireEvent.click(screen.getByText(/ai assist/i));
  };

  it('should show Gemini AI Assessment panel when AI Assist is selected', async () => {
    // Arrange & Act
    await goToAiStep();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/gemini ai assessment/i)).toBeInTheDocument();
    });
  });

  it('should show error when analyzing without selecting location', async () => {
    // Arrange
    await goToAiStep();

    // Simulate an image being selected (mock imageFile state via input)
    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /analyze with ai/i });

    // We can only test the error path here without actually uploading
    // because the analyze button only appears after imageFile is set
    // Instead, verify error shows when no location selected and analyze is triggered
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '' } });

    // Act — check by directly setting imageFile via the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);
    }

    await waitFor(() => {
      if (screen.queryByText(/analyze with ai/i)) {
        fireEvent.click(screen.getByText(/analyze with ai/i));
      }
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/please select a location before analyzing/i)
      ).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show AI result when assessAsset API returns success', async () => {
    // Arrange
    await goToAiStep();

    const mockAiResult = {
      condition: 'Spoiled',
      maintenanceNeeded: true,
      priority: 'high',
      issues: ['Broken screen', 'Bent frame'],
      fullResponse: 'Asset is severely damaged and must be removed.',
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/location'))
        return Promise.resolve({ json: () => Promise.resolve({ data: mockLocations }) });
      if (url.includes('/api/department'))
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      if (url.includes('/api/assessAsset'))
        return Promise.resolve({ json: () => Promise.resolve({ success: true, assessment: mockAiResult }) });
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    // Select location and department
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'LOC-1' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'DEPT-1' } });

    // Simulate uploading a file
    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);
    }

    // Act — click analyze
    await waitFor(() => {
      if (screen.queryByText(/analyze with ai/i)) {
        fireEvent.click(screen.getByText(/analyze with ai/i));
      }
    });

    // Assert — AI result displayed
    await waitFor(() => {
      expect(screen.getByText(/issues detected/i)).toBeInTheDocument();
      expect(screen.getByText(/broken screen/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should show error when assessAsset API returns failure', async () => {
    // Arrange
    await goToAiStep();

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/location'))
        return Promise.resolve({ json: () => Promise.resolve({ data: mockLocations }) });
      if (url.includes('/api/department'))
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      if (url.includes('/api/assessAsset'))
        return Promise.resolve({ json: () => Promise.resolve({ success: false, error: 'Invalid asset image' }) });
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'LOC-1' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'DEPT-1' } });

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', { value: [file] });
      fireEvent.change(fileInput);
    }

    await waitFor(() => {
      if (screen.queryByText(/analyze with ai/i)) {
        fireEvent.click(screen.getByText(/analyze with ai/i));
      }
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/invalid asset image/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Registering Mode (New Asset)
// ─────────────────────────────────────────────────────────────────────────────

describe('Registering Mode — New Asset', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchNewAsset();
  });

  it('should show Register Asset header for unknown asset', async () => {
    // Arrange & Act
    renderComponent();

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Register Asset')).toBeInTheDocument();
    });
  });

  it('should display the scanned asset ID in the form', async () => {
    // Arrange & Act
    renderComponent();

    // Assert
    await waitFor(() => {
      expect(screen.getByText('ASSET-001')).toBeInTheDocument();
    });
  });

  it('should show New Asset notice', async () => {
    // Arrange & Act
    renderComponent();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/this asset id was not found/i)).toBeInTheDocument();
    });
  });

  it('should show Register New Asset button', async () => {
    // Arrange & Act
    renderComponent();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/register new asset/i)).toBeInTheDocument();
    });
  });

  it('should alert when required fields are missing on register submit', async () => {
    // Arrange
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    await waitFor(() => screen.getByText(/register new asset/i));

    // Act — submit without filling fields
    fireEvent.click(screen.getByText(/register new asset/i));

    // Assert
    expect(mockAlert).toHaveBeenCalledWith(
      expect.stringContaining('required fields')
    );

    mockAlert.mockRestore();
  });

  it('should call onCreate with correct data on valid register submit', async () => {
    // Arrange
    renderComponent();
    await waitFor(() => screen.getByText(/register new asset/i));

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText(/dell latitude/i), {
      target: { value: 'My Laptop' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g., laptop/i), {
      target: { value: 'Laptop' },
    });
    fireEvent.change(screen.getByPlaceholderText(/latitude 5420/i), {
      target: { value: 'Latitude 5420' },
    });

    // Act
    fireEvent.click(screen.getByText(/register new asset/i));

    // Assert
    await waitFor(() => {
      expect(defaultOnCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Laptop',
          category: 'Laptop',
          model: 'Latitude 5420',
        })
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Header Title Logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Header Title', () => {

  beforeEach(() => jest.clearAllMocks());

  it('should show "Confirm Asset" for existing asset on confirm step', async () => {
    mockFetchExistingAsset();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Confirm Asset')).toBeInTheDocument();
    });
  });

  it('should show "Register Asset" for new asset', async () => {
    mockFetchNewAsset();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Register Asset')).toBeInTheDocument();
    });
  });

  it('should show "Update Asset" after clicking Update Asset button', async () => {
    mockFetchExistingAsset();
    renderComponent();

    await waitFor(() => screen.getByText(/update asset/i));
    fireEvent.click(screen.getByText(/update asset/i));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /update asset/i })).toBeInTheDocument();
    });
  });
});
