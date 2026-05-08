/**
 * Unit tests for the AddDepartmentPage
 *
 * This page is a thin wrapper that enforces admin access and passes 
 * the department configuration to the generic DynamicAdd component.
 *
 * What we cover:
 *   - Auth checking (renders nothing while loading or if not an admin)
 *   - Rendering DynamicAdd when authorized
 *   - Ensuring the correct config object is passed to DynamicAdd
 */

import { render, screen } from '@testing-library/react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import AddDepartmentPage from '@/app/(app)/admin/department/addDepartment/page';
import DynamicAdd from '@/components/dynamicAdd';

// Mock the admin access hook
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}));

// Mock the DynamicAdd component to just render a dummy div so we can check its props
jest.mock('@/components/dynamicAdd', () => {
  return jest.fn(() => <div data-testid="mock-dynamic-add" />);
});

describe('AddDepartmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing while admin access is loading', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false });
    
    const { container } = render(<AddDepartmentPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing if the user is not an admin', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false });
    
    const { container } = render(<AddDepartmentPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders DynamicAdd with the department config when user is an admin', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true });
    
    render(<AddDepartmentPage />);
    
    // Check that the mock component was rendered
    expect(screen.getByTestId('mock-dynamic-add')).toBeInTheDocument();

    // Verify that DynamicAdd was called with the correct configuration
    expect(DynamicAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          entityName: 'department',
          primaryKey: 'department_id',
          apiEndpoint: '/api/department',
        }),
      }),
      undefined // <-- FIX: Changed from {} to undefined
    );
  });
});
