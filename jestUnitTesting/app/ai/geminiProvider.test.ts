import { GeminiProvider } from '@/lib/ai/providers/geminiProvider';

// Mock the Gemini API client and its generateContent method (WC)
const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  })),
}));

// Helper to create Gemini-like response objects for testing (WC)
const makeGeminiResponse = (text: string) => ({
  response: { text: () => text },
});

// Tests for GeminiProvider.assessAssetCondition (WC)
beforeEach(() => {
  process.env.GEMINI_API_KEY = 'fake-key';
  jest.clearAllMocks();
});

describe('assessAssetCondition', () => {

  it('should return correct result for a valid In-use asset', async () => {
    // Arrange — first call = identification, second call = assessment (WC)
    mockGenerateContent
      .mockResolvedValueOnce(makeGeminiResponse(
        'IS_VALID_ASSET: Yes\nDETECTED_ASSET: Laptop\nREASON: Clearly a laptop'
      ))
      .mockResolvedValueOnce(makeGeminiResponse(
        'STATUS: In-use\nMAINTENANCE: No\nPRIORITY: None\nISSUES:\n- No visible defects detected'
      ));

    const provider = new GeminiProvider();

    // Act
    const result = await provider.assessAssetCondition('base64imagedata', 'image/jpeg');

    // Assert
    expect(result.condition).toBe('In-use');
    expect(result.maintenanceNeeded).toBe(false);
    expect(result.priority).toBe('none');
    expect(result.issues).toContain('No visible defects detected');
  });

  it('should return Spoiled + high priority for damaged asset', async () => {
    // Arrange
    mockGenerateContent
      .mockResolvedValueOnce(makeGeminiResponse(
        'IS_VALID_ASSET: Yes\nDETECTED_ASSET: Chair\nREASON: Office chair detected'
      ))
      .mockResolvedValueOnce(makeGeminiResponse(
        'STATUS: Spoiled\nMAINTENANCE: Yes\nPRIORITY: High\nISSUES:\n- Broken leg\n- Torn upholstery'
      ));

    const provider = new GeminiProvider();

    // Act
    const result = await provider.assessAssetCondition('base64imagedata', 'image/jpeg');

    // Assert
    expect(result.condition).toBe('Spoiled');
    expect(result.maintenanceNeeded).toBe(true);
    expect(result.priority).toBe('high');
    expect(result.issues).toHaveLength(2);
  });

  it('should throw INVALID_ASSET error when image is not a valid asset', async () => {
    // Arrange
    mockGenerateContent.mockResolvedValueOnce(makeGeminiResponse(
      'IS_VALID_ASSET: No\nDETECTED_ASSET: Unknown\nREASON: Image shows a person not an asset'
    ));

    const provider = new GeminiProvider();

    // Act & Assert
    await expect(
      provider.assessAssetCondition('base64imagedata', 'image/jpeg')
    ).rejects.toThrow('INVALID_ASSET');
  });

  it('should throw when GEMINI_API_KEY is missing', () => {
    // Arrange
    delete process.env.GEMINI_API_KEY;
    delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // Act & Assert
    expect(() => new GeminiProvider()).toThrow('GEMINI_API_KEY is not set');
  });

  it('should default to In-store when STATUS is missing in response', async () => {
    // Arrange
    mockGenerateContent
      .mockResolvedValueOnce(makeGeminiResponse(
        'IS_VALID_ASSET: Yes\nDETECTED_ASSET: Monitor\nREASON: Monitor detected'
      ))
      .mockResolvedValueOnce(makeGeminiResponse(
        // No STATUS line at all
        'MAINTENANCE: Yes\nPRIORITY: Medium\nISSUES:\n- Screen flicker'
      ));

    const provider = new GeminiProvider();
    const result = await provider.assessAssetCondition('base64imagedata', 'image/jpeg');

    // Assert: defaults to In-store when STATUS missing
    expect(result.condition).toBe('In-store');
  });

  it('should retry on 503 and succeed on second attempt', async () => {
    // Arrange: first call fails with 503, second call succeeds
    mockGenerateContent
      .mockRejectedValueOnce({ status: 503, message: 'Service Unavailable' })
      .mockResolvedValueOnce(makeGeminiResponse(
        'IS_VALID_ASSET: Yes\nDETECTED_ASSET: Keyboard\nREASON: Keyboard detected'
      ))
      .mockResolvedValueOnce(makeGeminiResponse(
        'STATUS: In-use\nMAINTENANCE: No\nPRIORITY: None\nISSUES:\n- No issues'
      ));

    const provider = new GeminiProvider();
    const result = await provider.assessAssetCondition('base64imagedata', 'image/jpeg');

    // Assert: eventually succeeds after retry
    expect(result.condition).toBe('In-use');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3); // 1 retry + 2 real calls
  });

  it('should throw after exhausting all retries on persistent 503', async () => {
    // Arrange: all attempts fail
    mockGenerateContent.mockRejectedValue({ status: 503, message: '503 Service Unavailable' });

    const provider = new GeminiProvider();

    await expect(
      provider.assessAssetCondition('base64imagedata', 'image/jpeg')
    ).rejects.toThrow();
  });
});