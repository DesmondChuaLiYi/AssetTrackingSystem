import { render, screen } from '@testing-library/react';
import EditLocationPage from '@/app/(app)/admin/location/editLocation/[id]/page';

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

describe('EditLocationPage', () => {
  const mockUseParams = require('next/navigation').useParams;

  beforeEach(() => {
    mockUseParams.mockReturnValue({ id: 'LOC001' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders DynamicEdit component', () => {
    render(<EditLocationPage />);

    expect(screen.getByTestId('dynamic-edit')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<EditLocationPage />);

    expect(screen.getByText('Edit Location')).toBeInTheDocument();
  });

  it('passes record ID from URL params', () => {
    render(<EditLocationPage />);

    expect(screen.getByTestId('record-id')).toHaveTextContent('LOC001');
  });

  it('configures correct entity names', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.entityName).toBe('location');
    expect(config.entityDisplayName).toBe('Locations');
    expect(config.entityDisplayNameSingular).toBe('Location');
  });

  it('sets correct API endpoint', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.apiEndpoint).toBe('/api/location');
  });

  it('sets correct primary key', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.primaryKey).toBe('location_id');
  });

  it('sets correct back URL', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.backUrl).toBe('/admin/location/Rooms');
  });

  it('disables location_id field for editing', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const locationIdField = config.formFields.find((f: any) => f.key === 'location_id');

    expect(locationIdField.disabled).toBe(true);
    expect(locationIdField.required).toBe(true);
  });

  it('configures all form fields', () => {
    render(<EditLocationPage />);

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

  it('marks name field as required', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const nameField = config.formFields.find((f: any) => f.key === 'name');

    expect(nameField.required).toBe(true);
  });

  it('makes description, block and level optional in edit mode', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const descriptionField = config.formFields.find((f: any) => f.key === 'description');
    const blockField = config.formFields.find((f: any) => f.key === 'block');
    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(descriptionField.required).toBeUndefined();
    expect(blockField.required).toBeUndefined();
    expect(levelField.required).toBeUndefined();
  });

  it('handles different location IDs correctly', () => {
    mockUseParams.mockReturnValue({ id: 'LOC999' });

    render(<EditLocationPage />);

    expect(screen.getByTestId('record-id')).toHaveTextContent('LOC999');
  });

  it('configures description as textarea', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const descriptionField = config.formFields.find((f: any) => f.key === 'description');

    expect(descriptionField.type).toBe('textarea');
  });

  it('configures level field as number input', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(levelField.type).toBe('number');
  });

  it('configures block field as text input', () => {
    render(<EditLocationPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const blockField = config.formFields.find((f: any) => f.key === 'block');

    expect(blockField.type).toBe('text');
  });
});
