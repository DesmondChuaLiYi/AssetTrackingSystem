import { render, screen } from '@testing-library/react';
import AssetsPage from '@/app/(app)/admin/assetTracking/assets/page';

// Mock DynamicPage component
jest.mock('@/components/DynamicPage', () => {
  return function MockDynamicPage({ config }: any) {
    return (
      <div data-testid="dynamic-page">
        <h1>{config.pageTitle}</h1>
        <p>{config.pageDescription}</p>
        <div data-testid="config">{JSON.stringify(config)}</div>
      </div>
    );
  };
});

describe('AssetsPage', () => {
  it('renders DynamicPage with correct config', () => {
    render(<AssetsPage />);
    
    expect(screen.getByTestId('dynamic-page')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<AssetsPage />);
    
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });

  it('displays correct page description', () => {
    render(<AssetsPage />);
    
    expect(screen.getByText("Manage and track your organisation's assets")).toBeInTheDocument();
  });

  it('configures correct entity name', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.entityName).toBe('asset');
    expect(config.entityDisplayName).toBe('Asset');
  });

  it('configures correct API endpoint', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.apiEndpoint).toBe('/api/assets');
  });

  it('configures correct primary key', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.primaryKey).toBe('asset_id');
  });

  it('enables add button', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.showAddButton).toBe(true);
  });

  it('enables condition filter', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.showConditionFilter).toBe(true);
  });

  it('configures search fields correctly', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.searchFields).toHaveLength(2);
    expect(config.searchFields[0].key).toBe('asset_id');
    expect(config.searchFields[1].key).toBe('name');
  });

  it('configures columns correctly', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.columns).toHaveLength(8);
    expect(config.columns[0].key).toBe('asset_id');
    expect(config.columns[0].sortable).toBe(true);
  });

  it('configures form fields correctly', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.formFields).toHaveLength(8);
    
    const assetIdField = config.formFields.find((f: any) => f.key === 'asset_id');
    expect(assetIdField.required).toBe(true);
    expect(assetIdField.disabled).toBe(false);
    
    const conditionField = config.formFields.find((f: any) => f.key === 'condition');
    expect(conditionField.type).toBe('select');
    expect(conditionField.options).toHaveLength(3);
  });

  it('sets correct navigation URLs', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.addUrl).toBe('/admin/assetTracking/addAsset');
    expect(config.editUrl).toBe('/admin/assetTracking/editAsset');
  });

  it('sets default sort by created date', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    expect(config.defaultSortBy).toBe('created_dt');
  });

  it('includes location and department in form fields', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const locationField = config.formFields.find((f: any) => f.key === 'location_id');
    const departmentField = config.formFields.find((f: any) => f.key === 'department_id');
    
    expect(locationField).toBeDefined();
    expect(locationField.type).toBe('select');
    expect(locationField.required).toBe(true);
    
    expect(departmentField).toBeDefined();
    expect(departmentField.type).toBe('select');
    expect(departmentField.required).toBe(true);
  });

  it('configures condition field with correct options', () => {
    render(<AssetsPage />);
    
    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');
    
    const conditionField = config.formFields.find((f: any) => f.key === 'condition');
    
    expect(conditionField.options).toEqual([
      { value: 'In-use', label: 'In-use' },
      { value: 'In-store', label: 'In-store' },
      { value: 'Spoiled', label: 'Spoiled' }
    ]);
  });
});