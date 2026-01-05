import { render, screen } from '@testing-library/react';
import EditDepartmentPage from '@/app/(app)/admin/department/editDepartment/[id]/page';

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

describe('EditDepartmentPage', () => {
  const mockUseParams = require('next/navigation').useParams;

  beforeEach(() => {
    mockUseParams.mockReturnValue({ id: 'DEPT001' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders DynamicEdit component', () => {
    render(<EditDepartmentPage />);

    expect(screen.getByTestId('dynamic-edit')).toBeInTheDocument();
  });

  it('displays correct page title', () => {
    render(<EditDepartmentPage />);

    expect(screen.getByText('Edit Department')).toBeInTheDocument();
  });

  it('passes record ID from URL params', () => {
    render(<EditDepartmentPage />);

    expect(screen.getByTestId('record-id')).toHaveTextContent('DEPT001');
  });

  it('configures correct entity names', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.entityName).toBe('department');
    expect(config.entityDisplayName).toBe('Departments');
    expect(config.entityDisplayNameSingular).toBe('Department');
  });

  it('sets correct API endpoint', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.apiEndpoint).toBe('/api/department');
  });

  it('sets correct primary key', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.primaryKey).toBe('department_id');
  });

  it('sets correct back URL', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.backUrl).toBe('/admin/department/Units');
  });

  it('disables department_id field for editing', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const departmentIdField = config.formFields.find((f: any) => f.key === 'department_id');

    expect(departmentIdField.disabled).toBe(true);
    expect(departmentIdField.required).toBe(true);
  });

  it('configures all form fields', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    expect(config.formFields).toHaveLength(4);

    const fieldKeys = config.formFields.map((f: any) => f.key);
    expect(fieldKeys).toContain('department_id');
    expect(fieldKeys).toContain('name');
    expect(fieldKeys).toContain('block');
    expect(fieldKeys).toContain('level');
  });

  it('marks name field as required', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const nameField = config.formFields.find((f: any) => f.key === 'name');

    expect(nameField.required).toBe(true);
  });

  it('makes block and level optional in edit mode', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const blockField = config.formFields.find((f: any) => f.key === 'block');
    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(blockField.required).toBeUndefined();
    expect(levelField.required).toBeUndefined();
  });

  it('handles different department IDs correctly', () => {
    mockUseParams.mockReturnValue({ id: 'DEPT999' });

    render(<EditDepartmentPage />);

    expect(screen.getByTestId('record-id')).toHaveTextContent('DEPT999');
  });

  it('configures level field as number input', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const levelField = config.formFields.find((f: any) => f.key === 'level');

    expect(levelField.type).toBe('number');
  });

  it('configures block field as text input', () => {
    render(<EditDepartmentPage />);

    const configElement = screen.getByTestId('config');
    const config = JSON.parse(configElement.textContent || '{}');

    const blockField = config.formFields.find((f: any) => f.key === 'block');

    expect(blockField.type).toBe('text');
  });
});
