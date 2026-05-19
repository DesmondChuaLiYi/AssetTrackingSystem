/**
 * @jest-environment @edge-runtime/jest-environment
 */
import { POST } from '@/app/api/approveAssessments/route';
import { NextRequest } from 'next/server';
import { validateSession } from '@/lib/apiAuth';

// Mock validateSession 
jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn(),
}));

// Mock Supabase 
// Declare mocks outside so tests can control return values via mockResolvedValue
const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ update: mockUpdate }));

// Factory uses a getter so the mock variables above stay live after clearAllMocks()
jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return { from: mockFrom };
  },
}));

// Helper to create a NextRequest with JSON body
const makeRequest = (body: object) =>
  new NextRequest('http://localhost/api/approveAssessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

// Test POST /api/approveAssessments route handler
describe('POST /api/approveAssessments', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore the Supabase chain after clearAllMocks() resets the implementations
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  // Pass test
  it('should return 200 and success:true when approved successfully', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });
    mockEq.mockResolvedValue({ error: null });

    // Act
    const res  = await POST(makeRequest({
      assessmentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('should call validateSession with "admin" role', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });
    mockEq.mockResolvedValue({ error: null });

    // Act
    await POST(makeRequest({
      assessmentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    }));

    // Assert: route must enforce admin-only access
    expect(validateSession).toHaveBeenCalledWith('admin');
  });

  it('should update the correct Supabase row with approval_status and actioned_at', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });
    mockEq.mockResolvedValue({ error: null });

    // Act
    await POST(makeRequest({
      assessmentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    }));

    // Assert: correct table, correct fields, correct id
    expect(mockFrom).toHaveBeenCalledWith('Maintenance');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ approval_status: 'approved' })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  });

  // Test FAIL 
  it('should return 401 when user is not an admin', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    // Act
    const res = await POST(makeRequest({
      assessmentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    }));

    // Assert
    expect(res.status).toBe(401);
    // Supabase should never be touched if auth fails
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // INVALID UUID 
  it('should return 400 and "Validation failed" when assessmentId is not a valid UUID', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });

    // Act
    const res = await POST(makeRequest({ assessmentId: 'not-a-uuid' }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    // Zod flatten() always produces formErrors and fieldErrors
    expect(json.details).toHaveProperty('fieldErrors');
  });

  // MISSING FIELD 
  it('should return 400 when assessmentId is missing from the body', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });

    // Act
    const res = await POST(makeRequest({}));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
  });

  it('should return 400 when extra unknown fields are sent (strict schema)', async () => {
    // Arrange: payloadSchema uses .strict() so extra keys are rejected
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });

    // Act
    const res  = await POST(makeRequest({
      assessmentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      extraField: 'should-be-rejected',
    }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
  });

  // DATABASE ERROR 
  it('should return 500 and success:false when Supabase returns an error', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });
    // Route does: if (error) throw error — so a truthy error object triggers the catch block
    mockEq.mockResolvedValue({ error: { message: 'DB failed' } });

    // Act
    const res = await POST(makeRequest({
      assessmentId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Failed to approve');
  });
});