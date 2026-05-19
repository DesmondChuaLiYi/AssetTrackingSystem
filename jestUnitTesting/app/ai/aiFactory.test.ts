// Mock GeminiProvider so Jest never loads the real class (avoids API key / import issues)
jest.mock('@/lib/ai/providers/geminiProvider', () => ({
  GeminiProvider: class GeminiProvider {},
}));

// We only import getAiProvider after the mock is set up, so it gets the mocked GeminiProvider (WC)
describe('getAiProvider', () => {

  beforeEach(() => {
    jest.resetModules(); // clears require() cache so env changes take effect (WC)
  });

  it('should return GeminiProvider when AI_PROVIDER is gemini', () => {
    // Arrange
    process.env.AI_PROVIDER = 'gemini';

    // Act
    const { getAiProvider } = require('@/lib/ai/aiFactory');
    const provider = getAiProvider();

    // Assert
    expect(provider.constructor.name).toBe('GeminiProvider');
  });

  it('should throw when AI_PROVIDER is unknown', () => {
    // Arrange
    process.env.AI_PROVIDER = 'unknownModel';

    // Act & Assert
    const { getAiProvider } = require('@/lib/ai/aiFactory');
    expect(() => getAiProvider()).toThrow('Unknown AI_PROVIDER: "unknownModel"');
  });
});