/**
 * Unit tests for the AddLocationPage
 *
 * This page is a thin wrapper that enforces admin access and passes 
 * the location configuration to the generic DynamicAdd component.
 *
 * What we cover:
 *   - Auth checking (renders nothing while loading or if not an admin)
 *   - Rendering DynamicAdd when authorized
 *   - Ensuring the correct config object is passed to DynamicAdd
 */

import { render, screen } from '@testing-library/react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import AddLocationPage from '@/app/(app)/admin/location/addLocation/page';
import DynamicAdd from '@/components/dynamicAdd';

// Mock the admin access hook
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}));

// Mock the DynamicAdd component to just render a dummy div so we can check its props
jest.mock('@/components/dynamicAdd', () => {
  return jest.fn(() => <div data-testid="mock-dynamic-add" />);
});

describe('AddLocationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing while admin access is loading', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: true, isAdmin: false });
    
    const { container } = render(<AddLocationPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing if the user is not an admin', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: false });
    
    const { container } = render(<AddLocationPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders DynamicAdd with the location config when user is an admin', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({ isLoading: false, isAdmin: true });
    
    render(<AddLocationPage />);
    
    // Check that the mock component was rendered
    expect(screen.getByTestId('mock-dynamic-add')).toBeInTheDocument();

    // Verify that DynamicAdd was called with the correct configuration
    expect(DynamicAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          entityName: 'location',
          primaryKey: 'location_id',
          apiEndpoint: '/api/location',
        }),
      }),
      undefined // Explicitly undefined as per React functional component signature
    );
  });
});
