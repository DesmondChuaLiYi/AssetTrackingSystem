import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { assessFurnitureCondition } from '@/lib/ai/geminiService';
import { saveAssessment } from '@/lib/supabase/assessmentService';

const payloadSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  assetId: z.string().uuid('Invalid Asset ID'),
  locationId: z.string().uuid('Invalid Location ID'),
  userId: z.string().uuid().optional(),
  mimeType: z.string().optional(),
});

async function authenticateUser() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name: string) { return cookieStore.get(name)?.value; } },
  });
  const { data: { session }, error } = await supabaseAuth.auth.getSession();
  if (error || !session) throw new Error('Unauthorized');
  return session.user;
}

export async function POST(request: NextRequest) {
  try {
    // Only requires standard user validation, not admin
    await authenticateUser();

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
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to process assessment' }, { status: 500 });
  }
}