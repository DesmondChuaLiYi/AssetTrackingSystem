import { render, screen } from '@testing-library/react';
import EditAssetPage from '@/app/(app)/admin/assetTracking/editAsset/[id]/page';

// Mock useParams
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock DynamicEdit component
jest.mock('@/components/DynamicEdit', () => {
  return function MockDynamicEdit({ config, recordId }: any) {
    return (
      <div data-testid="dynamic-edit">
        <h1>{config.pageTitle}</h1>
        <div data-testid="record-id">{recordId}</div>
        <div data-testid="config">{JSON.stringify(config)}</div>
      </div>
    );
  };
});

describe('EditAssetPage', () => {
  const mockUseParams = require('next/navigation').useParams;

  beforeEach(() => {
    mockUseParams.mockReturnValue({ id: 'TEST123' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders DynamicEdit component', () => {
    render(<EditAssetPage />);
    
    expect(screen.getByTestId('dynamic-edit')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<EditAssetPage />);
    
    expect(screen.getByText('Edit Asset')).toBeInTheDocument();
  });

  it('passes record ID from URL params', () => {
    render(<EditAssetPage />);
    
    expect(screen.getByTestId('record-id')).toHaveTextContent('TEST123');
  });

  it('configures correct entity names', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.entityName).toBe('asset');
    expect(config.entityDisplayName).toBe('Assets');
    expect(config.entityDisplayNameSingular).toBe('Asset');
  });

  it('sets correct API endpoint', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.apiEndpoint).toBe('/api/assets');
  });

  it('sets correct primary key', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.primaryKey).toBe('asset_id');
  });

  it('sets correct back URL', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.backUrl).toBe('/admin/assetTracking/Assets');
  });

  it('disables asset_id field for editing', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const assetIdField = config.formFields.find((f: any) => f.key === 'asset_id');
    
    expect(assetIdField.disabled).toBe(true);
    expect(assetIdField.required).toBe(true);
  });

  it('configures all form fields', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.formFields).toHaveLength(8);
    
    const fieldKeys = config.formFields.map((f: any) => f.key);
    expect(fieldKeys).toContain('asset_id');
    expect(fieldKeys).toContain('name');
    expect(fieldKeys).toContain('model');
    expect(fieldKeys).toContain('description');
    expect(fieldKeys).toContain('category');
    expect(fieldKeys).toContain('condition');
    expect(fieldKeys).toContain('location_id');
    expect(fieldKeys).toContain('department_id');
  });

  it('marks required fields correctly', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const nameField = config.formFields.find((f: any) => f.key === 'name');
    const modelField = config.formFields.find((f: any) => f.key === 'model');
    const categoryField = config.formFields.find((f: any) => f.key === 'category');
    
    expect(nameField.required).toBe(true);
    expect(modelField.required).toBe(true);
    expect(categoryField.required).toBe(true);
  });

  it('makes location and department optional in edit mode', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const locationField = config.formFields.find((f: any) => f.key === 'location_id');
    const departmentField = config.formFields.find((f: any) => f.key === 'department_id');
    
    expect(locationField.required).toBeUndefined();
    expect(departmentField.required).toBeUndefined();
  });

  it('configures condition field with correct options', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const conditionField = config.formFields.find((f: any) => f.key === 'condition');
    
    expect(conditionField.type).toBe('select');
    expect(conditionField.options).toEqual([
      { value: 'In-use', label: 'In-use' },
      { value: 'In-store', label: 'In-store' },
      { value: 'Spoiled', label: 'Spoiled' }
    ]);
  });

  it('handles different asset IDs correctly', () => {
    mockUseParams.mockReturnValue({ id: 'ASSET999' });
    
    render(<EditAssetPage />);
    
    expect(screen.getByTestId('record-id')).toHaveTextContent('ASSET999');
  });

  it('configures description as textarea', () => {
    render(<EditAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const descriptionField = config.formFields.find((f: any) => f.key === 'description');
    
    expect(descriptionField.type).toBe('textarea');
  });
});