import { supabaseAdmin } from './server';
import type { AssessmentInput, MaintenanceAssessment } from './types';

export async function saveAssessment(
  input: AssessmentInput,
  imageBase64?: string 
): Promise<MaintenanceAssessment> {
  console.log('=== Saving Assessment ===');
  
  let imageUrl: string | null = null;

  // Only save image if maintenance is needed
  if (input.maintenance_needed && imageBase64) {
    try {
      console.log('Uploading image (maintenance needed)...');
      
      // Convert base64 to buffer
      const buffer = Buffer.from(imageBase64, 'base64');
      const fileName = `${input.asset_id}_${Date.now()}.jpg`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('AssetImage')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
      } else {
        // Get public URL
        const { data: urlData } = supabaseAdmin
          .storage
          .from('AssetImage')
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
        console.log('Image uploaded:', imageUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  }

  // Insert assessment record
  const { data: assessment, error: assessmentError } = await supabaseAdmin
    .from('Maintenance')
    .insert({
      asset_id: input.asset_id,
      location_id: input.location_id,
      condition_status: input.condition_status,
      maintenance_needed: input.maintenance_needed,
      priority: input.priority,
      ai_response: input.ai_response,
      assessed_by: input.assessed_by,
      image_url: imageUrl,  // Add image URL
      approval_status: 'pending',  // always start as pending

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

  // Update asset's current condition
  const { error: updateError } = await supabaseAdmin
    .from('Asset')
    .update({
      condition: input.condition_status,
      last_assessed_at: new Date().toISOString(),
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
    maintenance_needed: assessment.maintenance_needed,
    priority: assessment.priority,
    ai_response: assessment.ai_response,
    assessed_at: assessment.assessed_at,
    assessed_by: assessment.assessed_by,
    image_url: assessment.image_url,       
    approval_status: assessment.approval_status, 
    created_dt: assessment.created_dt,
    updated_dt: assessment.updated_dt,
  };
}