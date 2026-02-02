export interface ProjectContext {
  id: string;
  title: string;
  description: string;
  repository?: {
    owner: string;
    name: string;
  };
  ideation?: {
    goals: string;
    targetAudience: string;
    keyFeatures: string;
    technicalRequirements: string;
  };
} 