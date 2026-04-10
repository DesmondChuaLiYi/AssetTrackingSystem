import type { AiProvider } from './aiProvider';

// Default 'gemini' if .env.AI_PROVIDER is not set
export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? 'gemini';
// Here to change AI model but the API key need to pre-loaded in enviroment file.
  switch (provider) {
    case 'gemini': {
      const { GeminiProvider } = require('./providers/geminiProvider');
      return new GeminiProvider();
    }
    // case 'openai': {
    //   const { OpenAiProvider } = require('./providers/openaiProvider');
    //   return new OpenAiProvider();
    // }
    default:
      throw new Error(`Unknown AI_PROVIDER: "${provider}". Check your .env file.`);
  }
}