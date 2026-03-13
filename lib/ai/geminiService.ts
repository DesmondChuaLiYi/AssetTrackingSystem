import { error } from 'console';
import { model } from './geminiClient';
import type { AiAssessmentResult } from '@/lib/supabase/types'; 

export async function assessFurnitureCondition(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<AiAssessmentResult> {
  console.log('=== Gemini Service Started ===');
  console.log('Image base64 length:', imageBase64?.length);
  console.log('MIME type:', mimeType);
  
  try {
    const prompt = `You are a furniture maintenance inspector. Analyze this image of furniture (chair or table) and assess its status.

Format your response EXACTLY as follows:
STATUS: [In-use/In-store/Spoiled]
MAINTENANCE: [Yes/No]
PRIORITY: [None/Low/Medium/High]
ISSUES:
- [issue 1]
- [issue 2]
- [issue 3]

Status definitions:
- In-use: Asset is in good condition and can be used actively
- In-store: Asset is functional but shows wear, suitable for storage or backup use
- Spoiled: Asset is damaged, broken, or unsafe - needs immediate attention or disposal

Focus on:
- Structural integrity (cracks, breaks, loose parts)
- Surface condition (scratches, stains, discoloration)
- Functional issues (wobbling, missing parts)
- Safety concerns

Provide maximum 3 main issues.`;

    console.log('Calling Gemini API...');
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
    ]);

    console.log('Gemini API responded successfully');
    const responseText = result.response.text();
    console.log('Response text:', responseText);
    
    const parsed = parseAssessmentResponse(responseText);
    console.log('Parsed result:', parsed);
    
    return {
      condition: parsed.condition,
      maintenanceNeeded: parsed.maintenanceNeeded,
      priority: parsed.priority,
      issues: parsed.issues,
      fullResponse: responseText,
    };
  } catch (error: any) {
    console.error('=== Gemini Service Error ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error status:', error?.status);
    console.error('Error statusText:', error?.statusText);
    console.error('Error details:', error?.errorDetails);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Error stack:', error?.stack);
    
    // Re-throw with more details
    throw new Error(
      `Gemini API Error: ${error?.message || 'Unknown error'} (Status: ${error?.status || 'N/A'})`
    );
  }
}

function parseAssessmentResponse(response: string): {
  condition: 'In-use' | 'In-store' | 'Spoiled';
  maintenanceNeeded: boolean;
  priority: 'none' | 'low' | 'medium' | 'high';
  issues: string[];
} {
  const statusMatch = response.match(/STATUS:\s*(In-use|In-store|Spoiled)/i);
  const maintenanceMatch = response.match(/MAINTENANCE:\s*(Yes|No)/i);
  const priorityMatch = response.match(/PRIORITY:\s*(None|Low|Medium|High)/i);
  
  const issuesSection = response.split('ISSUES:')[1] || '';
  const issues = issuesSection
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.trim().substring(1).trim())
    .filter(issue => issue.length > 0)
    .slice(0, 3);

  let condition: 'In-use' | 'In-store' | 'Spoiled' = 'In-store';
  if (statusMatch) {
    const matched = statusMatch[1];
    if (matched === 'In-use' || matched === 'In-store' || matched === 'Spoiled') {
      condition = matched;
    }
  }

  return {
    condition,
    maintenanceNeeded: maintenanceMatch?.[1]?.toLowerCase() === 'yes',
    priority: (priorityMatch?.[1]?.toLowerCase() as 'none' | 'low' | 'medium' | 'high') || 'none',
    issues: issues.length > 0 ? issues : ['No specific issues detected'],
  };
}
