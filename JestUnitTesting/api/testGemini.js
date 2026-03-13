const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('Testing Gemini API...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key exists:', !!apiKey);
  console.log('API Key starts with:', apiKey?.substring(0, 10));
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(['Say hello']);
    console.log('✅ Gemini API works!');
    console.log('Response:', result.response.text());
  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
    console.error('Full error:', error);
  }
}

testGemini();