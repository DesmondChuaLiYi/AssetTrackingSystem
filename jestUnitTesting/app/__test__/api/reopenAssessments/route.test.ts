/**
 * @jest-environment @edge-runtime/jest-environment
 */
import { POST } from '@/app/api/reopenAssessments/route';
import { NextRequest } from 'next/server';
import { validateSession } from '@/lib/apiAuth';

// Mock validateSession 
jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn(),
}));

// Mock Supabase 
const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ update: mockUpdate }));

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() { return { from: mockFrom }; },
}));

// Helper to create NextRequest with JSON body
const makeRequest = (body: object) =>
  new NextRequest('http://localhost/api/reopenAssessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// Tests 
describe('POST /api/reopenAssessments', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  // Success TEST, SUCCESSFUL RESPONSE
  it('should return 200 and success:true when valid', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });
    mockEq.mockResolvedValue({ error: null });

    // Act
    const res  = await POST(makeRequest({ assessmentId: VALID_UUID }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('should reset approval_status to "pending" and clear actioned_at', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });
    mockEq.mockResolvedValue({ error: null });

    // Act
    await POST(makeRequest({ assessmentId: VALID_UUID }));

    // Assert: must reset both fields exactly
    expect(mockUpdate).toHaveBeenCalledWith({
      approval_status: 'pending',
      actioned_at:     null,
    });
    expect(mockEq).toHaveBeenCalledWith('id', VALID_UUID);
  });

  // AUTHORIZATION TESTS
  it('should return 401 when user is not an admin', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    // Act
    const res = await POST(makeRequest({ assessmentId: VALID_UUID }));

    // Assert
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // VALIDATION TESTS
  it('should return 400 and "Validation failed" for an invalid UUID', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });

    // Act
    const res = await POST(makeRequest({ assessmentId: 'bad-id' }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(json.details).toHaveProperty('fieldErrors');
  });

  it('should return 400 when assessmentId is missing', async () => {
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
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });

    // Act
    const res = await POST(makeRequest({ assessmentId: VALID_UUID, extra: 'field' }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
  });

  // DB ERROR 
  it('should return 500 and "Failed to reopen" when Supabase errors', async () => {
    // Arrange
    (validateSession as jest.Mock).mockResolvedValue({ authorized: true });
    mockEq.mockResolvedValue({ error: { message: 'DB failed' } });

    // Act
    const res = await POST(makeRequest({ assessmentId: VALID_UUID }));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Failed to reopen');
  });
});