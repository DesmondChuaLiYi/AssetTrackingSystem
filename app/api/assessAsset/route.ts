import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/apiAuth';
import { z } from 'zod';
import { assessFurnitureCondition } from '@/lib/ai/geminiService';
import { saveAssessment } from '@/lib/supabase/assessmentService';

const payloadSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  assetId: z.string().uuid('Invalid Asset ID'),
  locationId: z.string().uuid('Invalid Location ID'),
  userId: z.string().uuid().optional().nullable(),
  mimeType: z.string().optional(),
}).strict();

export async function POST(request: NextRequest) {
  // Standard user auth: Any logged-in staff can submit an assessment
  const authResult = await validateSession();
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const validatedData = payloadSchema.parse(body);

    const aiResult = await assessFurnitureCondition(validatedData.image, validatedData.mimeType);

    const savedAssessment = await saveAssessment({
      asset_id: validatedData.assetId,
      location_id: validatedData.locationId,
      condition_status: aiResult.condition,
      maintenance_needed: aiResult.maintenanceNeeded,
      priority: aiResult.priority,
      ai_response: aiResult.fullResponse,
      assessed_by: validatedData.userId || null,
    }, validatedData.image);

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
  } catch (error: any) {
    console.error('Assessment API error:', { message: error?.message });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to process assessment' }, { status: 500 });
  }
}