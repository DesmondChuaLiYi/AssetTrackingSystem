import { render, screen } from '@testing-library/react';
import AddDepartmentPage from '@/app/(app)/admin/department/addDepartment/page';

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

describe('AddDepartmentPage', () => {
  it('renders DynamicAdd component', () => {
    render(<AddDepartmentPage />);

    expect(screen.getByTestId('dynamic-add')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<AddDepartmentPage />);

    expect(screen.getByText('Add Department')).toBeInTheDocument();
  });

  it('configures correct entity names', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.entityName).toBe('department');
    expect(config.entityDisplayName).toBe('Departments');
    expect(config.entityDisplayNameSingular).toBe('Department');
  });

  it('sets correct API endpoint', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.apiEndpoint).toBe('/api/department');
  });

  it('sets correct primary key', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.primaryKey).toBe('department_id');
  });

  it('sets correct back URL', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.backUrl).toBe('/admin/department/Units');
  });

  it('configures all required form fields', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.formFields).toHaveLength(4);

    const fieldKeys = config.formFields.map((f: any) => f.key);
    expect(fieldKeys).toContain('department_id');
    expect(fieldKeys).toContain('name');
    expect(fieldKeys).toContain('block');
    expect(fieldKeys).toContain('level');
  });

  it('marks department_id and name as required', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const departmentIdField = config.formFields.find((f: any) => f.key === 'department_id');
    const nameField = config.formFields.find((f: any) => f.key === 'name');

    expect(departmentIdField.required).toBe(true);
    expect(nameField.required).toBe(true);
  });

  it('makes block and level optional', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const blockField = config.formFields.find((f: any) => f.key === 'block');
    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(blockField.required).toBeUndefined();
    expect(levelField.required).toBeUndefined();
  });

  it('configures department_id field with placeholder', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const departmentIdField = config.formFields.find((f: any) => f.key === 'department_id');

    expect(departmentIdField.placeholder).toBe('Enter department code (e.g., from barcode scanner)');
    expect(departmentIdField.type).toBe('text');
  });

  it('configures name field correctly', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const nameField = config.formFields.find((f: any) => f.key === 'name');

    expect(nameField.type).toBe('text');
    expect(nameField.label).toBe('Name');
  });

  it('configures block field as text input', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const blockField = config.formFields.find((f: any) => f.key === 'block');

    expect(blockField.type).toBe('text');
    expect(blockField.label).toBe('Block');
  });

  it('configures level field as number input', () => {
    render(<AddDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(levelField.type).toBe('number');
    expect(levelField.label).toBe('Level');
  });
});
