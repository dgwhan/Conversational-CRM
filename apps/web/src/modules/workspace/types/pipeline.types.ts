export interface PipelineStageConfig {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  order: number;
  isWon?: boolean;
  isLost?: boolean;
  isSystem?: boolean;
}

