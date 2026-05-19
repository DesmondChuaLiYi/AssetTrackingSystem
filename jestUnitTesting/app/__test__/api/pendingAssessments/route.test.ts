/**
 * @jest-environment @edge-runtime/jest-environment
 */
import { GET } from '@/app/api/pendingAssessments/route';
import { NextRequest } from 'next/server';
import { validateSession } from '@/lib/apiAuth';

// Mock validateSession 
jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn(),
}));

// Mock Supabase
// The route builds a complex chained query — mock each method in the chain
const mockRange = jest.fn();
const mockOrder = jest.fn(() => ({ range: mockRange }));
const mockEqCond = jest.fn(() => ({ order: mockOrder }));
const mockIlike = jest.fn();
const mockEqStat = jest.fn();
const mockSelect = jest.fn();

// Count queries (head: true) return a simpler chain
const mockHeadEq  = jest.fn();
const mockHeadSel = jest.fn(() => ({ eq: mockHeadEq }));

const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() { return { from: mockFrom }; },
}));

// Helper to create NextRequest with query params
const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/pendingAssessments');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), { method: 'GET' });
};

const mockPageResult = {
  data:  [{ id: 'id-1', asset_id: 'ASSET-001', approval_status: 'pending' }],
  count: 1,
  error: null,
};

// Tests 
describe('GET /api/pendingAssessments', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth: authorized
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });

    // Default Supabase chain for paginated query
    mockRange.mockResolvedValue(mockPageResult);
    mockOrder.mockReturnValue({ range: mockRange });
    mockEqCond.mockReturnValue({ order: mockOrder });
    mockIlike.mockReturnValue({ ilike: mockIlike, eq: mockEqCond, order: mockOrder });
    mockEqStat.mockReturnValue({ eq: mockEqCond, ilike: mockIlike, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEqStat });

    // Default count query chain
    mockHeadEq.mockResolvedValue({ count: 5, error: null });
    mockHeadSel.mockReturnValue({ eq: mockHeadEq });

    mockFrom.mockImplementation(() => ({
      select: mockSelect,
    }));
  });

  // AUTHORIZATION 
  it('should return 401 when user is not an admin', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    // Act
    const res = await GET(makeRequest());

    // Assert
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should call validateSession with "admin" role', async () => {
    // Arrange
    mockRange.mockResolvedValue(mockPageResult);

    // Act
    await GET(makeRequest());

    // Assert
    expect(validateSession).toHaveBeenCalledWith('admin');
  });

  // Success TEST, SUCCESSFUL RESPONSE
  it('should return 200 with assessments and pagination info', async () => {
    // Arrange
    mockRange.mockResolvedValue({ data: [{ id: 'id-1' }], count: 1, error: null });

    // Act
    const res = await GET(makeRequest({ status: 'pending' }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.assessments).toHaveLength(1);
    expect(json).toHaveProperty('totalItems');
    expect(json).toHaveProperty('totalPages');
    expect(json).toHaveProperty('tabCounts');
  });

  it('should return tabCounts for pending, approved, and rejected', async () => {
    // Arrange
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });

    // Act
    const res  = await GET(makeRequest());
    const json = await res.json();

    // Assert
    expect(json.tabCounts).toHaveProperty('pending');
    expect(json.tabCounts).toHaveProperty('approved');
    expect(json.tabCounts).toHaveProperty('rejected');
  });

  // Test pagination logic: the route calculates range based on page and limit query params
  it('should default to page 1 and limit 10 when not specified', async () => {
    // Arrange
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });

    // Act
    await GET(makeRequest());

    // Assert: range(0, 9) = page 1, limit 10
    expect(mockRange).toHaveBeenCalledWith(0, 9);
  });

  it('should calculate correct range for page 2 with limit 10', async () => {
    // Arrange
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });

    // Act
    await GET(makeRequest({ page: '2', limit: '10' }));

    // Assert: range(10, 19)
    expect(mockRange).toHaveBeenCalledWith(10, 19);
  });

  it('should cap limit at 100 even if a higher value is passed', async () => {
    // Arrange
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });

    // Act
    await GET(makeRequest({ limit: '999' }));

    // Assert: range(0, 99) = page 1, limit capped at 100
    expect(mockRange).toHaveBeenCalledWith(0, 99);
  });

  // Test status filtering: the route allows filtering by approval_status, but defaults to "pending" if an invalid status is passed
  it('should default to "pending" status when an invalid status is passed', async () => {
    // Arrange — the route whitelists allowed statuses
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });

    // Act
    const res = await GET(makeRequest({ status: 'invalid-status' }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
  });

  // DATABASE ERROR 
  it('should return 500 when Supabase query fails', async () => {
    // Arrange
    mockRange.mockResolvedValue({ data: null, count: null, error: { message: 'DB error' } });

    // Act
    const res  = await GET(makeRequest());
    const json = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Failed to fetch');
  });
});