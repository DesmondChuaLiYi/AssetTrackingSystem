import { render, screen } from '@testing-library/react';
import AddAssetPage from '@/app/(app)/admin/assetTracking/addAsset/page';

// Mock DynamicAdd component
jest.mock('@/components/DynamicAdd', () => {
  return function MockDynamicAdd({ config }: any) {
    return (
      <div data-testid="dynamic-add">
        <h1>{config.pageTitle}</h1>
        <div data-testid="config">{JSON.stringify(config)}</div>
      </div>
    );
  };
});

describe('AddAssetPage', () => {
  it('renders DynamicAdd component', () => {
    render(<AddAssetPage />);
    
    expect(screen.getByTestId('dynamic-add')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<AddAssetPage />);
    
    expect(screen.getByText('Add Asset')).toBeInTheDocument();
  });

  it('configures correct entity names', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.entityName).toBe('asset');
    expect(config.entityDisplayName).toBe('Assets');
    expect(config.entityDisplayNameSingular).toBe('Asset');
  });

  it('sets correct API endpoint', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.apiEndpoint).toBe('/api/assets');
  });

  it('sets correct primary key', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.primaryKey).toBe('asset_id');
  });

  it('sets correct back URL', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.backUrl).toBe('/admin/assetTracking/Assets');
  });

  it('configures all required form fields', () => {
    render(<AddAssetPage />);
    
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
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const assetIdField = config.formFields.find((f: any) => f.key === 'asset_id');
    const nameField = config.formFields.find((f: any) => f.key === 'name');
    const modelField = config.formFields.find((f: any) => f.key === 'model');
    const categoryField = config.formFields.find((f: any) => f.key === 'category');
    
    expect(assetIdField.required).toBe(true);
    expect(nameField.required).toBe(true);
    expect(modelField.required).toBe(true);
    expect(categoryField.required).toBe(true);
  });

  it('makes location and department optional', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const locationField = config.formFields.find((f: any) => f.key === 'location_id');
    const departmentField = config.formFields.find((f: any) => f.key === 'department_id');
    
    expect(locationField.required).toBeUndefined();
    expect(departmentField.required).toBeUndefined();
  });

  it('configures asset_id field with placeholder', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const assetIdField = config.formFields.find((f: any) => f.key === 'asset_id');
    
    expect(assetIdField.placeholder).toBe('Enter asset barcode (e.g., from barcode scanner)');
    expect(assetIdField.type).toBe('text');
  });

  it('configures description as textarea', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const descriptionField = config.formFields.find((f: any) => f.key === 'description');
    
    expect(descriptionField.type).toBe('textarea');
  });

  it('configures condition field as select with options', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const conditionField = config.formFields.find((f: any) => f.key === 'condition');
    
    expect(conditionField.type).toBe('select');
    expect(conditionField.options).toHaveLength(3);
    expect(conditionField.options).toEqual([
      { value: 'In-use', label: 'In-use' },
      { value: 'In-store', label: 'In-store' },
      { value: 'Spoiled', label: 'Spoiled' }
    ]);
  });

  it('configures location_id as select field', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const locationField = config.formFields.find((f: any) => f.key === 'location_id');
    
    expect(locationField.type).toBe('select');
    expect(locationField.label).toBe('Location (Optional)');
  });

  it('configures department_id as select field', () => {
    render(<AddAssetPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const departmentField = config.formFields.find((f: any) => f.key === 'department_id');
    
    expect(departmentField.type).toBe('select');
    expect(departmentField.label).toBe('Department (Optional)');
  });
});