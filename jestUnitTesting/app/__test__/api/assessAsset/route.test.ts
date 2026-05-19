/**
 * @jest-environment @edge-runtime/jest-environment
 */
import { POST } from '@/app/api/assessAsset/route';
import { NextRequest } from 'next/server';

// Mock getAiProvider 
const mockAssessAssetCondition = jest.fn();

jest.mock('@/lib/ai/aiFactory', () => ({
  getAiProvider: jest.fn(() => ({
    assessAssetCondition: mockAssessAssetCondition,
  })),
}));

// Helper to create a NextRequest with JSON body
const makeRequest = (body: object) =>
  new NextRequest('http://localhost/api/assessAsset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const validBody = {
  image: 'base64encodedimage',
  assetId: 'ASSET-001',
  locationId: 'LOC-001',
  mimeType: 'image/jpeg',
};

const mockAiResult = {
  condition: 'Spoiled',
  maintenanceNeeded:  true,
  priority: 'high',
  issues: ['Broken leg', 'Cracked surface'],
  fullResponse: 'ISSUES:\n- Broken leg\n- Cracked surface',
};

// Tests 
describe('POST /api/assessAsset', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Success test with valid input
  it('should return 200 with assessment when all fields are valid', async () => {
    // Arrange
    mockAssessAssetCondition.mockResolvedValue(mockAiResult);

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.assessment).toMatchObject({
      condition: 'Spoiled',
      maintenanceNeeded: true,
      priority: 'high',
    });
  });

  it('should pass image and mimeType to the AI provider', async () => {
    // Arrange
    mockAssessAssetCondition.mockResolvedValue(mockAiResult);

    // Act
    await POST(makeRequest(validBody));

    // Assert
    expect(mockAssessAssetCondition).toHaveBeenCalledWith(
      validBody.image,
      validBody.mimeType,
    );
  });

  // MISSING FIELDS 
  it('should return 400 when image is missing', async () => {
    // Arrange
    const { image, ...body } = validBody;

    // Act
    const res = await POST(makeRequest(body));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing required fields');
  });

  it('should return 400 when assetId is missing', async () => {
    // Arrange
    const { assetId, ...body } = validBody;

    // Act
    const res = await POST(makeRequest(body));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing required fields');
  });

  it('should return 400 when locationId is missing', async () => {
    // Arrange
    const { locationId, ...body } = validBody;

    // Act
    const res = await POST(makeRequest(body));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing required fields');
  });

  // INVALID ASSET 
  it('should return 422 when AI throws INVALID_ASSET error', async () => {
    // Arrange: AI rejects the image because it's not a recognised asset type
    mockAssessAssetCondition.mockRejectedValue(
      new Error('INVALID_ASSET: Image does not match any accepted asset'),
    );

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(422);
    expect(json.error).toBe('Invalid asset image');
    expect(json.detail).toBe('Image does not match any accepted asset');
    expect(json.acceptedAssets).toContain('Chair');
    expect(json.acceptedAssets).toContain('Laptop');
  });

  it('should include the full accepted assets list in a 422 response', async () => {
    // Arrange
    mockAssessAssetCondition.mockRejectedValue(
      new Error('INVALID_ASSET: Not a valid asset'),
    );

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert — all 9 accepted assets must be present
    expect(json.acceptedAssets).toEqual(
      expect.arrayContaining([
        'Chair', 'Table', 'Whiteboard', 'Laptop',
        'Desktop computer', 'Monitor', 'CPU', 'Mouse', 'Keyboard',
      ]),
    );
  });

  // SERVER ERROR
  it('should return 500 when AI provider throws an unexpected error', async () => {
    // Arrange
    mockAssessAssetCondition.mockRejectedValue(new Error('Network timeout'));

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(json.error).toBe('Failed to process assessment');
    expect(json.details).toBe('Network timeout');
  });

  it('should return "Unknown error" in details when error is not an Error instance', async () => {
    // Arrange
    mockAssessAssetCondition.mockRejectedValue('string error');

    // Act
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(json.details).toBe('Unknown error');
  });
});