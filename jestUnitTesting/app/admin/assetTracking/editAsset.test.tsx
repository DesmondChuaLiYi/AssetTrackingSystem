/**
 * Tests cover:
 *   - Auth guard behaviour (loading, non-admin, admin)
 *   - useParams — string id, array id, undefined id
 *   - DynamicEdit receives correct config
 *   - Form field configurations
 *   - asset_id is disabled in edit mode
 *   - location and department are optional
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditAssetPage from '@/app/(app)/admin/assetTracking/editAsset/[id]/page';

// Mock useAdminAccess (WC)
const mockUseAdminAccess = jest.fn();
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

// Mock useParams (WC)
const mockUseParams = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
}));

// Mock DynamicEdit (WC)
jest.mock('@/components/dynamicEdit', () => ({
  __esModule: true,
  default: ({ config, recordId }: any) => (
    <div data-testid="dynamic-edit">
      <h1>{config.pageTitle}</h1>
      <div data-testid="record-id">{recordId}</div>
      <div data-testid="config">{JSON.stringify(config)}</div>
    </div>
  ),
}));

// Helper: parse config from DOM (WC)
const getConfig = () => {
  const el = screen.getByTestId('config');
  return JSON.parse(el.textContent || '{}');
};

// SUITE 1: Auth Guard (WC)
describe('EditAssetPage — Auth Guard', () => {

  beforeEach(() => {
    mockUseParams.mockReturnValue({ id: 'TEST-001' });
  });

  it('should render nothing when isLoading is true', () => {
    // Arrange
    mockUseAdminAccess.mockReturnValue({ isLoading: true, isAdmin: false });

    // Act
    const { container } = render(<EditAssetPage />);

    // Assert
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when user is not admin', () => {
    // Arrange
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: false });

    // Act
    const { container } = render(<EditAssetPage />);

    // Assert
    expect(container.firstChild).toBeNull();
  });

  it('should render DynamicEdit when user is admin', () => {
    // Arrange
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: true });

    // Act
    render(<EditAssetPage />);

    // Assert
    expect(screen.getByTestId('dynamic-edit')).toBeInTheDocument();
  });
});

// SUITE 2: 'useParams: ID Extraction' (WC)
describe('EditAssetPage — useParams ID Extraction', () => {

  beforeEach(() => {
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: true });
  });

  it('should pass string id directly to DynamicEdit', () => {
    // Arrange: normal case: id is a string
    mockUseParams.mockReturnValue({ id: 'ICT-LAPTOP-001' });

    // Act
    render(<EditAssetPage />);

    // Assert
    expect(screen.getByTestId('record-id')).toHaveTextContent('ICT-LAPTOP-001');
  });

  it('should use first element when id is an array', () => {
    // Arrange: edge case: Next.js can return id as string[]
    mockUseParams.mockReturnValue({ id: ['ICT-LAPTOP-001', 'EXTRA'] });

    // Act
    render(<EditAssetPage />);

    // Assert: only first element is used
    expect(screen.getByTestId('record-id')).toHaveTextContent('ICT-LAPTOP-001');
  });

  it('should pass empty string when id is undefined', () => {
    // Arrange: edge case: no id in URL
    mockUseParams.mockReturnValue({ id: undefined });

    // Act
    render(<EditAssetPage />);

    // Assert: ?? '' fallback kicks in
    expect(screen.getByTestId('record-id')).toHaveTextContent('');
  });

  it('should handle different asset IDs correctly', () => {
    // Arrange
    mockUseParams.mockReturnValue({ id: 'ASSET-999' });

    // Act
    render(<EditAssetPage />);

    // Assert
    expect(screen.getByTestId('record-id')).toHaveTextContent('ASSET-999');
  });
});

// SUITE 3: Page Config (WC)
describe('EditAssetPage — Page Config', () => {

  beforeEach(() => {
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: true });
    mockUseParams.mockReturnValue({ id: 'TEST-001' });
    render(<EditAssetPage />);
  });

  it('should display correct page title', () => {
    expect(screen.getByText('Edit Asset')).toBeInTheDocument();
  });

  it('should pass correct entityName', () => {
    expect(getConfig().entityName).toBe('asset');
  });

  it('should pass correct entityDisplayName', () => {
    expect(getConfig().entityDisplayName).toBe('Assets');
  });

  it('should pass correct entityDisplayNameSingular', () => {
    expect(getConfig().entityDisplayNameSingular).toBe('Asset');
  });

  it('should pass correct apiEndpoint', () => {
    expect(getConfig().apiEndpoint).toBe('/api/assets');
  });

  it('should pass correct primaryKey', () => {
    expect(getConfig().primaryKey).toBe('asset_id');
  });

  it('should pass correct backUrl — lowercase assets', () => {
    // Important: must be lowercase 'assets'
    expect(getConfig().backUrl).toBe('/admin/assetTracking/assets');
  });
});

// SUITE 4: Form Fields (WC)
describe('EditAssetPage — Form Fields', () => {

  beforeEach(() => {
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: true });
    mockUseParams.mockReturnValue({ id: 'TEST-001' });
    render(<EditAssetPage />);
  });

  it('should have exactly 8 form fields', () => {
    expect(getConfig().formFields).toHaveLength(8);
  });

  it('should contain all expected field keys in correct order', () => {
    const keys = getConfig().formFields.map((f: any) => f.key);
    expect(keys).toEqual([
      'asset_id', 'name', 'model', 'description',
      'category', 'condition', 'location_id', 'department_id'
    ]);
  });

  it('should have asset_id disabled and required — prevents PK change', () => {
    // This is the KEY difference from addAsset, PK cannot be changed after creation
    const field = getConfig().formFields.find((f: any) => f.key === 'asset_id');
    expect(field.disabled).toBe(true);
    expect(field.required).toBe(true);
  });

  it('should mark name as required text field', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'name');
    expect(field.required).toBe(true);
    expect(field.type).toBe('text');
  });

  it('should mark model as required text field', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'model');
    expect(field.required).toBe(true);
    expect(field.type).toBe('text');
  });

  it('should mark category as required text field', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'category');
    expect(field.required).toBe(true);
    expect(field.type).toBe('text');
  });

  it('should configure description as optional textarea', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'description');
    expect(field.type).toBe('textarea');
    expect(field.required).toBeUndefined();
  });

  it('should configure condition as select with exactly 3 options', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'condition');
    expect(field.type).toBe('select');
    expect(field.options).toHaveLength(3);
    expect(field.options).toEqual([
      { value: 'In-use', label: 'In-use'},
      { value: 'In-store', label: 'In-store'},
      { value: 'Spoiled', label: 'Spoiled'},
    ]);
  });

  it('should configure location_id as optional select', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'location_id');
    expect(field.type).toBe('select');
    expect(field.label).toBe('Location (Optional)');
    expect(field.required).toBeUndefined(); 
  });

  it('should configure department_id as optional select', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'department_id');
    expect(field.type).toBe('select');
    expect(field.label).toBe('Department (Optional)');
    expect(field.required).toBeUndefined(); 
  });
});

// SUITE 5: Edit vs Add Difference (WC)
describe('EditAssetPage — Key Difference from AddAssetPage', () => {

  beforeEach(() => {
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: true });
    mockUseParams.mockReturnValue({ id: 'TEST-001' });
    render(<EditAssetPage />);
  });

  it('asset_id should be DISABLED — cannot change PK after creation', () => {
    // This is the single most important difference between edit and add
    const field = getConfig().formFields.find((f: any) => f.key === 'asset_id');
    expect(field.disabled).toBe(true);
  });

  it('page title should be Edit Asset not Add Asset', () => {
    expect(screen.getByText('Edit Asset')).toBeInTheDocument();
    expect(screen.queryByText('Add Asset')).not.toBeInTheDocument();
  });
});
