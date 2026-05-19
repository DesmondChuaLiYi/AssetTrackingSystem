/**
 * @jest-environment @edge-runtime/jest-environment
 */
import { GET } from '@/app/api/cleanupImages/route';
import { NextRequest } from 'next/server';

// Mock Supabase 
const mockRemove = jest.fn();
const mockStorageFrom = jest.fn(() => ({
  remove: mockRemove,
  getPublicUrl: jest.fn(),
}));

const mockIn = jest.fn();
const mockUpdate = jest.fn(() => ({ in: mockIn }));
const mockLt = jest.fn();
const mockInStatus = jest.fn(() => ({ lt: mockLt }));
const mockSelect = jest.fn(() => ({ in: mockInStatus }));
const mockFrom = jest.fn((table: string) => {
  if (table === 'Maintenance') return { select: mockSelect, update: mockUpdate };
  return {};
});

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return {
      from:    mockFrom,
      storage: { from: mockStorageFrom },
    };
  },
}));

// Helper to create NextRequest with optional Authorization header
const makeRequest = (authHeader?: string) =>
  new NextRequest('http://localhost/api/cleanupImages', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  });

// Tests 
describe('GET /api/cleanupImages', () => {

  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    // Restore chain after clearAllMocks
    mockFrom.mockImplementation((table: string) => {
      if (table === 'Maintenance') return { select: mockSelect, update: mockUpdate };
      return {};
    });
    mockSelect.mockReturnValue({ in: mockInStatus });
    mockInStatus.mockReturnValue({ lt: mockLt });
    mockUpdate.mockReturnValue({ in: mockIn });
    mockStorageFrom.mockReturnValue({ remove: mockRemove, getPublicUrl: jest.fn() });
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  // AUTHENTICATION 
  it('should return 401 when Authorization header is missing', async () => {
    // Act
    const res = await GET(makeRequest());
    const json = await res.json();

    // Assert
    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('should return 401 when Authorization header has wrong secret', async () => {
    // Act
    const res = await GET(makeRequest('Bearer wrong-secret'));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  // NO RECORDS 
  it('should return 200 with deleted:0 when no old records exist', async () => {
    // Arrange: DB returns empty array
    mockLt.mockResolvedValue({ data: [], error: null });

    // Act
    const res = await GET(makeRequest('Bearer test-secret'));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(0);
    // Storage should not be touched when there's nothing to delete
    expect(mockRemove).not.toHaveBeenCalled();
  });

  // Success test, successful DELETION
  it('should delete images from storage and return deleted count', async () => {
    // Arrange
    mockLt.mockResolvedValue({
      data: [
        { id: 'id-1', image_url: 'https://example.com/storage/v1/object/public/AssetImage/file1.jpg' },
        { id: 'id-2', image_url: 'https://example.com/storage/v1/object/public/AssetImage/file2.jpg' },
      ],
      error: null,
    });
    mockRemove.mockResolvedValue({ error: null });
    mockIn.mockResolvedValue({ error: null });

    // Act
    const res = await GET(makeRequest('Bearer test-secret'));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(2);
    expect(mockRemove).toHaveBeenCalledWith(['file1.jpg', 'file2.jpg']);
  });

  it('should clear image_url column for cleaned-up records', async () => {
    // Arrange
    mockLt.mockResolvedValue({
      data: [{ id: 'id-1', image_url: 'https://example.com/storage/v1/object/public/AssetImage/file1.jpg' }],
      error: null,
    });
    mockRemove.mockResolvedValue({ error: null });
    mockIn.mockResolvedValue({ error: null });

    // Act
    await GET(makeRequest('Bearer test-secret'));

    // Assert: image_url must be nulled out after deletion
    expect(mockUpdate).toHaveBeenCalledWith({ image_url: null });
    expect(mockIn).toHaveBeenCalledWith('id', ['id-1']);
  });

  // DB ERROR 
  it('should return 500 when Supabase fetch fails', async () => {
    // Arrange
    mockLt.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    // Act
    const res = await GET(makeRequest('Bearer test-secret'));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Cleanup failed');
  });

  it('should return 500 when storage deletion fails', async () => {
    // Arrange
    mockLt.mockResolvedValue({
      data: [{ id: 'id-1', image_url: 'https://example.com/storage/v1/object/public/AssetImage/file1.jpg' }],
      error: null,
    });
    mockRemove.mockResolvedValue({ error: { message: 'Storage error' } });

    // Act
    const res  = await GET(makeRequest('Bearer test-secret'));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });

  // EDGE CASES 
  it('should skip storage deletion for records with null image_url', async () => {
    // Arrange: records with no image should not crash the route
    mockLt.mockResolvedValue({
      data: [{ id: 'id-1', image_url: null }],
      error: null,
    });
    mockIn.mockResolvedValue({ error: null });

    // Act
    const res = await GET(makeRequest('Bearer test-secret'));
    const json = await res.json();

    // Assert: storage.remove should not be called since filePaths is empty
    expect(mockRemove).not.toHaveBeenCalled();
    expect(json.deleted).toBe(0);
  });
});