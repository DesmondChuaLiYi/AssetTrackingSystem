import { render, screen } from '@testing-library/react';
import LocationRoomsPage from '@/app/(app)/admin/location/rooms/page';

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

describe('LocationRoomsPage', () => {
  it('renders DynamicPage with correct config', () => {
    render(<LocationRoomsPage />);

    expect(screen.getByTestId('dynamic-page')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<LocationRoomsPage />);

    expect(screen.getByText('Location Management')).toBeInTheDocument();
  });

  it('displays correct page description', () => {
    render(<LocationRoomsPage />);

    expect(screen.getByText('Manage organisational locations and rooms')).toBeInTheDocument();
  });

  it('configures correct entity name', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.entityName).toBe('location');
    expect(config.entityDisplayName).toBe('Location');
  });

  it('configures correct API endpoint', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.apiEndpoint).toBe('/api/location');
  });

  it('configures correct primary key', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.primaryKey).toBe('location_id');
  });

  it('enables add button', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.showAddButton).toBe(true);
  });

  it('disables condition filter', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.showConditionFilter).toBe(false);
  });

  it('configures search fields correctly', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.searchFields).toHaveLength(2);
    expect(config.searchFields[0].key).toBe('location_id');
    expect(config.searchFields[0].label).toBe('Search by Location ID');
    expect(config.searchFields[1].key).toBe('name');
    expect(config.searchFields[1].label).toBe('Search by Asset Name');
  });

  it('configures columns correctly', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.columns).toHaveLength(6);
    expect(config.columns[0].key).toBe('location_id');
    expect(config.columns[0].sortable).toBe(true);
    expect(config.columns[1].key).toBe('name');
    expect(config.columns[1].sortable).toBe(true);
    expect(config.columns[2].key).toBe('description');
    expect(config.columns[3].key).toBe('block');
    expect(config.columns[4].key).toBe('level');
    expect(config.columns[5].key).toBe('created_dt');
  });

  it('configures form fields correctly', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.formFields).toHaveLength(5);

    const locationIdField = config.formFields.find((f: any) => f.key === 'location_id');
    expect(locationIdField.required).toBe(true);

    const nameField = config.formFields.find((f: any) => f.key === 'name');
    expect(nameField.required).toBe(true);
  });

  it('sets correct navigation URLs', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.addUrl).toBe('/admin/location/addLocation');
    expect(config.editUrl).toBe('/admin/location/editLocation');
  });

  it('sets default sort by created date', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.defaultSortBy).toBe('created_dt');
  });

  it('includes description in form fields', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const descriptionField = config.formFields.find((f: any) => f.key === 'description');

    expect(descriptionField).toBeDefined();
    expect(descriptionField.type).toBe('text');
  });

  it('includes block and level in form fields', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const blockField = config.formFields.find((f: any) => f.key === 'block');
    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(blockField).toBeDefined();
    expect(blockField.type).toBe('text');

    expect(levelField).toBeDefined();
    expect(levelField.type).toBe('number');
  });

  it('configures created_dt column with date render function', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const createdDtColumn = config.columns.find((c: any) => c.key === 'created_dt');

    expect(createdDtColumn).toBeDefined();
    expect(createdDtColumn.sortable).toBe(true);
    expect(createdDtColumn.label).toBe('Created Date');
  });

  it('makes all columns sortable', () => {
    render(<LocationRoomsPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    config.columns.forEach((column: any) => {
      expect(column.sortable).toBe(true);
    });
  });
});
