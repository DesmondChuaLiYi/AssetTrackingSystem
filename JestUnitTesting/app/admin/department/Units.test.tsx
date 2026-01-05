import { render, screen } from '@testing-library/react';
import DepartmentPage from '@/app/(app)/admin/department/units/page';

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

describe('DepartmentPage', () => {
  it('renders DynamicPage with correct config', () => {
    render(<DepartmentPage />);

    expect(screen.getByTestId('dynamic-page')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<DepartmentPage />);

    expect(screen.getByText('Department Management')).toBeInTheDocument();
  });

  it('displays correct page description', () => {
    render(<DepartmentPage />);

    expect(screen.getByText('Manage organisational departments and units')).toBeInTheDocument();
  });

  it('configures correct entity name', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.entityName).toBe('department');
    expect(config.entityDisplayName).toBe('Department');
  });

  it('configures correct API endpoint', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.apiEndpoint).toBe('/api/department');
  });

  it('configures correct primary key', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.primaryKey).toBe('department_id');
  });

  it('enables add button', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.showAddButton).toBe(true);
  });

  it('disables condition filter', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.showConditionFilter).toBe(false);
  });

  it('configures search fields correctly', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.searchFields).toHaveLength(2);
    expect(config.searchFields[0].key).toBe('department');
    expect(config.searchFields[0].label).toBe('Search by Department ID');
    expect(config.searchFields[1].key).toBe('name');
    expect(config.searchFields[1].label).toBe('Search by Department Name');
  });

  it('configures columns correctly', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.columns).toHaveLength(5);
    expect(config.columns[0].key).toBe('department_id');
    expect(config.columns[0].sortable).toBe(true);
    expect(config.columns[1].key).toBe('name');
    expect(config.columns[1].sortable).toBe(true);
    expect(config.columns[2].key).toBe('block');
    expect(config.columns[3].key).toBe('level');
    expect(config.columns[4].key).toBe('created_dt');
  });

  it('configures form fields correctly', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.formFields).toHaveLength(4);

    const departmentIdField = config.formFields.find((f: any) => f.key === 'department_id');
    expect(departmentIdField.required).toBe(true);

    const nameField = config.formFields.find((f: any) => f.key === 'name');
    expect(nameField.required).toBe(true);
  });

  it('sets correct navigation URLs', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.addUrl).toBe('/admin/department/addDepartment');
    expect(config.editUrl).toBe('/admin/department/editDepartment');
  });

  it('sets default sort by created date', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.defaultSortBy).toBe('created_dt');
  });

  it('includes block and level in form fields', () => {
    render(<DepartmentPage />);

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
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const createdDtColumn = config.columns.find((c: any) => c.key === 'created_dt');

    expect(createdDtColumn).toBeDefined();
    expect(createdDtColumn.sortable).toBe(true);
    expect(createdDtColumn.label).toBe('Created Date');
  });

  it('makes all columns sortable', () => {
    render(<DepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    config.columns.forEach((column: any) => {
      expect(column.sortable).toBe(true);
    });
  });
});
