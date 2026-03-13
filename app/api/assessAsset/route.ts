// app/api/assessAsset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { assessFurnitureCondition } from '@/lib/ai/geminiService';
import { saveAssessment } from '@/lib/supabase/assessmentService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, assetId, locationId, userId, mimeType } = body;

    if (!image || !assetId || !locationId) {
      return NextResponse.json(
        { error: 'Missing required fields: image, assetId, locationId' },
        { status: 400 }
      );
    }

    // Pass mimeType to the AI service
    const aiResult = await assessFurnitureCondition(image, mimeType);

    const savedAssessment = await saveAssessment({
      asset_id: assetId,
      location_id: locationId,
      condition_status: aiResult.condition,
      maintenance_needed: aiResult.maintenanceNeeded,
      priority: aiResult.priority,
      ai_response: aiResult.fullResponse,
      assessed_by: userId || null,
    },
    image  // Pass the base64 image
  );

    return NextResponse.json({
      success: true,
      assessment: {
        id: savedAssessment.id,
        condition: aiResult.condition,
        maintenanceNeeded: aiResult.maintenanceNeeded,
        priority: aiResult.priority,
        issues: aiResult.issues,
        assessedAt: savedAssessment.assessed_at,
      },
    });
  } catch (error) {
    console.error('Assessment API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process assessment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}