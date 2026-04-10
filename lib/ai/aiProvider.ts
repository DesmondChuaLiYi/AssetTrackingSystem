// Defines the AiProvider interface and AiAssessmentResult structure for asset condition assessment using AI models. (WC)
export interface AiAssessmentResult {
  condition: 'In-use' | 'In-store' | 'Spoiled';
  maintenanceNeeded: boolean;
  priority: 'none' | 'low' | 'medium' | 'high';
  issues: string[];
  fullResponse: string;
}
// AiProvider interface defines the contract for AI providers to implement asset condition assessment, 
// ensuring consistent method signatures across different AI implementations. (WC)
export interface AiProvider {
  assessAssetCondition(imageBase64: string, mimeType: string): Promise<AiAssessmentResult>;
}