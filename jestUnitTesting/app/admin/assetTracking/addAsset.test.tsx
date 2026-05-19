/**
 * Tests cover:
 *   - Auth guard behaviour (loading, non-admin, admin)
 *   - DynamicAdd receives correct config
 *   - All form field configurations are correct
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddAssetPage from '@/app/(app)/admin/assetTracking/addAsset/page';

// Mock useAdminAccess 
// without this the component always returns null (WC)
const mockUseAdminAccess = jest.fn();
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

//  Mock DynamicAdd 
// Renders the config as JSON so we can assert on it (WC)
jest.mock('@/components/dynamicAdd', () => ({
  __esModule: true,
  default: ({ config }: any) => (
    <div data-testid="dynamic-add">
      <h1>{config.pageTitle}</h1>
      <div data-testid="config">{JSON.stringify(config)}</div>
    </div>
  ),
}));

// Helper: parse config from DOM (WC)
const getConfig = () => {
  const el = screen.getByTestId('config');
  return JSON.parse(el.textContent || '{}');
};

// SUITE 1: Auth Guard
describe('AddAssetPage — Auth Guard', () => {

  it('should render nothing when isLoading is true', () => {
    // Arrange
    mockUseAdminAccess.mockReturnValue({ isLoading: true, isAdmin: false });

    // Act
    const { container } = render(<AddAssetPage />);

    // Assert
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when user is not admin', () => {
    // Arrange
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: false });

    // Act
    const { container } = render(<AddAssetPage />);

    // Assert
    expect(container.firstChild).toBeNull();
  });

  it('should render DynamicAdd when user is admin', () => {
    // Arrange
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: true });

    // Act
    render(<AddAssetPage />);

    // Assert
    expect(screen.getByTestId('dynamic-add')).toBeInTheDocument();
  });
});

// SUITE 2: Page Config (WC)
describe('AddAssetPage — Page Config', () => {

  beforeEach(() => {
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: true });
    render(<AddAssetPage />);
  });

  it('should pass correct pageTitle to DynamicAdd', () => {
    expect(screen.getByText('Add Asset')).toBeInTheDocument();
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
    // Important: lowercase 'assets' not 'Assets'
    expect(getConfig().backUrl).toBe('/admin/assetTracking/assets');
  });
});
 
// SUITE 3: Form Fields (WC)
describe('AddAssetPage — Form Fields', () => {

  beforeEach(() => {
    mockUseAdminAccess.mockReturnValue({ isLoading: false, isAdmin: true });
    render(<AddAssetPage />);
  });

  it('should have exactly 8 form fields', () => {
    expect(getConfig().formFields).toHaveLength(8);
  });

  it('should contain all expected field keys', () => {
    const keys = getConfig().formFields.map((f: any) => f.key);
    expect(keys).toEqual([
      'asset_id', 'name', 'model', 'description',
      'category', 'condition', 'location_id', 'department_id'
    ]);
  });

  it('should mark asset_id as required text field with correct placeholder', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'asset_id');
    expect(field.required).toBe(true);
    expect(field.type).toBe('text');
    expect(field.placeholder).toBe('e.g. SN12345678 (max 30 chars)');
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
    expect(field.required).toBeFalsy(); 
  });

  it('should configure condition as select with 3 options', () => {
    const field = getConfig().formFields.find((f: any) => f.key === 'condition');
    expect(field.type).toBe('select');
    expect(field.options).toHaveLength(3);
    expect(field.options).toEqual([
      { value: 'In-use', label: 'In-use' },
      { value: 'In-store', label: 'In-store' },
      { value: 'Spoiled', label: 'Spoiled' },
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
