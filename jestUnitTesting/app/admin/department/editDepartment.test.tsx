/**
 * Unit tests for the EditDepartmentPage
 *
 * This page extracts the department ID from the URL params, enforces admin access, 
 * and passes the data to the generic DynamicEdit component.
 *
 * What we cover:
 *   - Auth checking (renders nothing while loading or if not an admin)
 *   - ID extraction from useParams (handles string, array, and missing params)
 *   - Rendering DynamicEdit when authorized with the correct config and ID
 */

import { render, screen } from '@testing-library/react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useParams } from 'next/navigation';
import EditDepartmentPage from '@/app/(app)/admin/department/editDepartment/[id]/page';
import DynamicEdit from '@/components/dynamicEdit';

// Mock the admin access hook
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock the DynamicEdit component
jest.mock('@/components/dynamicEdit', () => {
  return jest.fn(() => <div data-testid="mock-dynamic-edit" />);
});

describe('EditDepartmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing while admin access is loading', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false });
    (useParams as jest.Mock).mockReturnValue({ id: 'IT' });
    
    const { container } = render(<EditDepartmentPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing if the user is not an admin', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false });
    (useParams as jest.Mock).mockReturnValue({ id: 'IT' });
    
    const { container } = render(<EditDepartmentPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('passes a string ID to DynamicEdit correctly', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true });
    (useParams as jest.Mock).mockReturnValue({ id: 'MKT' }); // String ID
    
    render(<EditDepartmentPage />);
    
    expect(screen.getByTestId('mock-dynamic-edit')).toBeInTheDocument();
    
    expect(DynamicEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'MKT',
        config: expect.objectContaining({ entityName: 'department' }),
      }),
      undefined // <-- FIX: Changed from {} to undefined
    );
  });

  it('extracts the first item if the ID parameter is an array', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true });
    (useParams as jest.Mock).mockReturnValue({ id: ['HR', 'OTHER'] }); // Array ID
    
    render(<EditDepartmentPage />);
    
    expect(DynamicEdit).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: 'HR' }),
      undefined // <-- FIX: Changed from {} to undefined
    );
  });

  it('falls back to an empty string if the ID parameter is missing', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true });
    (useParams as jest.Mock).mockReturnValue({}); // Missing ID
    
    render(<EditDepartmentPage />);
    
    expect(DynamicEdit).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: '' }),
      undefined // <-- FIX: Changed from {} to undefined
    );
  });
});
