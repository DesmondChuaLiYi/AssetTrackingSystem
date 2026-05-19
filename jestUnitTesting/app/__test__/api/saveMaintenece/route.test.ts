/**
 * @jest-environment @edge-runtime/jest-environment
 */
import { POST } from '@/app/api/saveMaintenance/route';
import { NextRequest } from 'next/server';

// Mock Supabase 
const mockSingle = jest.fn();
const mockSelectSingle = jest.fn(() => ({ single: mockSingle }));
const mockEqLocation = jest.fn(() => ({ single: mockSingle }));

const mockInsertSingle = jest.fn();
const mockInsertSelect = jest.fn(() => ({ single: mockInsertSingle }));
const mockInsert = jest.fn(() => ({ select: mockInsertSelect }));

const mockEqAsset = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEqAsset }));

// Storage mocks
const mockGetPublicUrl = jest.fn(() => ({ data: { publicUrl: 'https://example.com/storage/v1/object/public/AssetImage/file.jpg' } }));
const mockUpload = jest.fn();
const mockStorageFrom = jest.fn(() => ({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
}));

// imageUrl update chain after upload
const mockEqImageUpdate = jest.fn();
const mockUpdateImage = jest.fn(() => ({ eq: mockEqImageUpdate }));

const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return {
      from: mockFrom,
      storage: { from: mockStorageFrom },
    };
  },
}));

// Helper to create NextRequest with JSON body
const makeRequest = (body: object) =>
  new NextRequest('http://localhost/api/saveMaintenance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const validBody = {
  asset_id: 'ASSET-001',
  location_id: 'LOC-001',
  condition_status: 'Spoiled',
  department_id: 'DEPT-001',
  maintenance_needed: true,
  priority: 'high',
  feedback: null,
  ai_response: 'ISSUES:\n- Broken leg',
  image_base64: 'base64string',
  image_mime: 'image/jpeg',
  assessed_by: 'user-123',
};

const mockAssessment = {
  id: 'assess-uuid-001',
  asset_id: 'ASSET-001',
  location_id: 'LOC-001',
  condition_status: 'Spoiled',
  department_id: 'DEPT-001',
  maintenance_needed: true,
  priority: 'high',
  feedback: null,
  ai_response: 'ISSUES:\n- Broken leg',
  image_url: null,
  approval_status: 'pending',
  assessed_dt: '2025-01-01T00:00:00Z',
  assessed_by: 'user-123',
  created_dt: '2025-01-01T00:00:00Z',
  updated_dt: '2025-01-01T00:00:00Z',
};

// Tests 
describe('POST /api/saveMaintenance', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: location exists
    mockSingle.mockResolvedValue({ data: { location_id: 'LOC-001' }, error: null });

    // Default: DB insert succeeds
    mockInsertSingle.mockResolvedValue({ data: mockAssessment, error: null });

    // Default: image upload succeeds
    mockUpload.mockResolvedValue({ error: null });

    // Default: image_url update succeeds
    mockEqImageUpdate.mockResolvedValue({ error: null });

    // Default: asset condition update succeeds
    mockEqAsset.mockResolvedValue({ error: null });

    // Wire up mockFrom per table
    mockFrom.mockImplementation((table: string) => {
      if (table === 'Location') return { select: jest.fn(() => ({ eq: mockEqLocation })) };
      if (table === 'Maintenance') return {
        insert: mockInsert,
        update: mockUpdate,
      };
      if (table === 'Asset') return { update: mockUpdate };
      return {};
    });

    mockEqLocation.mockReturnValue({ single: mockSingle });
  });

  // SUCCESS TESTS
  it('should return 200 with assessment data on success', async () => {
    // Arrange: all mocks set to success in beforeEach

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.assessment).toMatchObject({
      id: 'assess-uuid-001',
      asset_id: 'ASSET-001',
      approval_status: 'pending',
    });
  });

  it('should always insert with approval_status "pending"', async () => {
    // Act
    await POST(makeRequest(validBody));

    // Assert — new assessments must always start as pending
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ approval_status: 'pending' }),
    );
  });

  it('should upload image when maintenance_needed is true and image_base64 is provided', async () => {
    // Act
    await POST(makeRequest(validBody));

    // Assert
    expect(mockUpload).toHaveBeenCalled();
  });

  it('should NOT upload image when maintenance_needed is false', async () => {
    // Arrange
    const body = { ...validBody, maintenance_needed: false };

    // Act
    await POST(makeRequest(body));

    // Assert — no image upload for non-maintenance assessments
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('should NOT upload image when image_base64 is missing', async () => {
    // Arrange
    const { image_base64, ...body } = validBody;

    // Act
    await POST(makeRequest(body));

    // Assert
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('should update the asset condition in the Asset table', async () => {
    // Act
    await POST(makeRequest(validBody));

    // Assert
    expect(mockEqAsset).toHaveBeenCalledWith('asset_id', 'ASSET-001');
  });

  // INVALID LOCATION 
  it('should return error when location_id does not exist', async () => {
    // Arrange: location lookup returns nothing
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert
    expect(json.success).toBe(false);
    expect(json.error).toContain('Invalid location_id');
    // DB insert should never be called if location is invalid
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // DB INSERT ERROR 
  it('should return error when DB insert fails', async () => {
    // Arrange
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    });

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert
    expect(json.success).toBe(false);
    expect(json.error).toContain('Failed to save assessment');
    // Image upload should never happen if insert failed
    expect(mockUpload).not.toHaveBeenCalled();
  });

  // IMAGE UPLOAD FAILURE 
  it('should still return 200 even when image upload fails (non-critical)', async () => {
    // Arrange — DB insert succeeds, but image upload fails
    mockUpload.mockResolvedValue({ error: { message: 'Upload failed' } });

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert: assessment is saved regardless of image upload failure
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  // FILE EXTENSION 
  it('should use .png extension for image/png mime type', async () => {
    // Arrange
    const body = { ...validBody, image_mime: 'image/png' };

    // Act
    await POST(makeRequest(body));

    // Assert: filename should end with .png
    const uploadCall = mockUpload.mock.calls[0];
    expect(uploadCall[0]).toMatch(/\.png$/);
  });

  it('should use .webp extension for image/webp mime type', async () => {
    // Arrange
    const body = { ...validBody, image_mime: 'image/webp' };

    // Act
    await POST(makeRequest(body));

    // Assert
    const uploadCall = mockUpload.mock.calls[0];
    expect(uploadCall[0]).toMatch(/\.webp$/);
  });

  it('should fall back to .jpg for unknown mime types', async () => {
    // Arrange
    const body = { ...validBody, image_mime: 'image/bmp' };

    // Act
    await POST(makeRequest(body));

    // Assert
    const uploadCall = mockUpload.mock.calls[0];
    expect(uploadCall[0]).toMatch(/\.jpg$/);
  });

  // SERVER ERROR 
  it('should return success:false when an unexpected error is thrown', async () => {
    // Arrange: simulate a crash before any DB calls
    mockFrom.mockImplementation(() => { throw new Error('Unexpected crash'); });

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert
    expect(json.success).toBe(false);
    expect(json.error).toBe('Unexpected crash');
  });
});