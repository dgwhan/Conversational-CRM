export interface LeadQualificationCriteria {
  id: string;
  name: string;
  type: 'TEXT' | 'SELECT' | 'NUMBER' | 'BOOLEAN';
  options?: string[];
  isRequired: boolean;
}

