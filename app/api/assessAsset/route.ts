import { NextRequest, NextResponse } from 'next/server';
// get the selected AI model from aiFactory folder
import { getAiProvider } from '@/lib/ai/aiFactory';

// API route to assess asset condition using Gemini AI (WC)
export async function POST(request: NextRequest) {
  console.log('ENV CHECK:', {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    geminiKey: !!process.env.GEMINI_API_KEY,
  });

  try {
    const body = await request.json();
    const { image, assetId, locationId, mimeType } = body;
    // validate required fields are return error 400 is missing required fields (WC)
    if (!image || !assetId || !locationId) {
      return NextResponse.json(
        { error: 'Missing required fields: image, assetId, locationId' },
        { status: 400 }
      );
    }

    const ai = getAiProvider();
    const aiResult = await ai.assessAssetCondition(image, mimeType);

    //Save assessment while asset and location ID matches in the database (WC)
    return NextResponse.json({
      success: true,
      assessment: {
        condition: aiResult.condition,
        maintenanceNeeded: aiResult.maintenanceNeeded,
        priority: aiResult.priority,
        issues: aiResult.issues,
        fullResponse: aiResult.fullResponse,
      },
    });

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('INVALID_ASSET:')) {
      const detail = error.message.replace('INVALID_ASSET: ', '');
      // The asset is not in the predefined list of acceptable assets, return 422 with details and accepted assets list (WC)
      return NextResponse.json(
        {
          error: 'Invalid asset image',
          detail,
          acceptedAssets: [
            'Chair', 'Table', 'Whiteboard', 'Laptop',
            'Desktop computer', 'Monitor', 'CPU', 'Mouse', 'Keyboard',
          ],
        },
        { status: 422 }
      );
    }

    console.error('Assessment API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process assessment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}