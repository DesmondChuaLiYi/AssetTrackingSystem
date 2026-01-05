import { render, screen } from '@testing-library/react';
import AddLocationPage from '@/app/(app)/admin/location/addLocation/page';

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

describe('AddLocationPage', () => {
  it('renders DynamicAdd component', () => {
    render(<AddLocationPage />);

    expect(screen.getByTestId('dynamic-add')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<AddLocationPage />);

    expect(screen.getByText('Add Location')).toBeInTheDocument();
  });

  it('configures correct entity names', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.entityName).toBe('location');
    expect(config.entityDisplayName).toBe('Locations');
    expect(config.entityDisplayNameSingular).toBe('Location');
  });

  it('sets correct API endpoint', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.apiEndpoint).toBe('/api/location');
  });

  it('sets correct primary key', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.primaryKey).toBe('location_id');
  });

  it('sets correct back URL', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.backUrl).toBe('/admin/location/Rooms');
  });

  it('configures all required form fields', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.formFields).toHaveLength(5);

    const fieldKeys = config.formFields.map((f: any) => f.key);
    expect(fieldKeys).toContain('location_id');
    expect(fieldKeys).toContain('name');
    expect(fieldKeys).toContain('description');
    expect(fieldKeys).toContain('block');
    expect(fieldKeys).toContain('level');
  });

  it('marks location_id and name as required', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const locationIdField = config.formFields.find((f: any) => f.key === 'location_id');
    const nameField = config.formFields.find((f: any) => f.key === 'name');

    expect(locationIdField.required).toBe(true);
    expect(nameField.required).toBe(true);
  });

  it('makes description, block and level optional', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const descriptionField = config.formFields.find((f: any) => f.key === 'description');
    const blockField = config.formFields.find((f: any) => f.key === 'block');
    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(descriptionField.required).toBeUndefined();
    expect(blockField.required).toBeUndefined();
    expect(levelField.required).toBeUndefined();
  });

  it('configures location_id field with placeholder', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const locationIdField = config.formFields.find((f: any) => f.key === 'location_id');

    expect(locationIdField.placeholder).toBe('Enter location code (e.g., from QR code)');
    expect(locationIdField.type).toBe('text');
  });

  it('configures name field correctly', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const nameField = config.formFields.find((f: any) => f.key === 'name');

    expect(nameField.type).toBe('text');
    expect(nameField.label).toBe('Name');
  });

  it('configures description as textarea', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const descriptionField = config.formFields.find((f: any) => f.key === 'description');

    expect(descriptionField.type).toBe('textarea');
    expect(descriptionField.label).toBe('Description');
  });

  it('configures block field as text input', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const blockField = config.formFields.find((f: any) => f.key === 'block');

    expect(blockField.type).toBe('text');
    expect(blockField.label).toBe('Block');
  });

  it('configures level field as number input', () => {
    render(<AddLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(levelField.type).toBe('number');
    expect(levelField.label).toBe('Level');
  });
});
