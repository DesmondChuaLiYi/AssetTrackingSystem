import { supabaseAdmin } from './server';
import type { AssessmentInput, MaintenanceAssessment } from './types';

export async function saveAssessment(
  input: AssessmentInput,
  imageBase64?: string
): Promise<MaintenanceAssessment> {
  console.log('=== Saving Assessment ===');

  // Validate location_id exists before doing anything (WC)
  const { data: locationExists, error: locationError } = await supabaseAdmin
    .from('Location')
    .select('location_id')
    .eq('location_id', input.location_id)
    .single();

  if (locationError || !locationExists) {
    throw new Error(`Invalid location_id: ${input.location_id} does not exist`);
  }

  // Insert DB record first (no image yet)
  const { data: assessment, error: assessmentError } = await supabaseAdmin
    .from('Maintenance')
    .insert({
      asset_id: input.asset_id,
      location_id: input.location_id,
      department_id: input.department_id ?? null,
      condition_status: input.condition_status,
      maintenance_needed: input.maintenance_needed,
      priority: input.priority,
      ai_response: input.ai_response,
      assessed_by: input.assessed_by,
      image_url: null,              
      approval_status: 'pending',
    })
    .select()
    .single();

  if (assessmentError) {
    console.error('=== Database Error Details ===');
    console.error('Error code:', assessmentError.code);
    console.error('Error message:', assessmentError.message);
    throw new Error(`Failed to save assessment: ${assessmentError.message}`);
  }

  console.log('Assessment saved:', assessment.id);

  // Only upload image after DB insert succeeds
  let imageUrl: string | null = null;

  if (input.maintenance_needed && imageBase64) {
    try {
      console.log('Uploading image (maintenance needed)...');
      const buffer = Buffer.from(imageBase64, 'base64');
      const fileName = `${input.asset_id}_${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('AssetImage')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
      } else {
        const { data: urlData } = supabaseAdmin
          .storage
          .from('AssetImage')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
        console.log('Image uploaded:', imageUrl);

        // Only update the record with the image URL if the upload was successful
        await supabaseAdmin
          .from('Maintenance')
          .update({ image_url: imageUrl })
          .eq('id', assessment.id);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // DB record is safe, the image upload failure is non-fatal
    }
  }

  // Update asset condition
  const { error: updateError } = await supabaseAdmin
    .from('Asset')
    .update({
      condition: input.condition_status,
      last_assessed_dt: new Date().toISOString(),
      updated_dt: new Date().toISOString(),
    })
    .eq('asset_id', input.asset_id);

  if (updateError) {
    console.error('Error updating asset:', updateError);
  }
  return {
    id: assessment.id,
    asset_id: assessment.asset_id,
    location_id: assessment.location_id,
    condition_status: assessment.condition_status,
    department_id: assessment.department_id,
    maintenance_needed: assessment.maintenance_needed,
    priority: assessment.priority,
    ai_response: assessment.ai_response,
    assessed_dt: assessment.assessed_dt,
    assessed_by: assessment.assessed_by,
    image_url: imageUrl,
    approval_status: assessment.approval_status,
    created_dt: assessment.created_dt,
    updated_dt: assessment.updated_dt,
  };
}