export interface EmployeeProfile {
  id: string;
  name: string;
  skills: string[];
  experience: number;
  role: string;
  projects: string[];
}

export interface Availability {
  employeeId: string;
  availableFrom: string;
  availableTo: string;
}

export interface MatchResult {
  employee: EmployeeProfile;
  score: number;
  reasons: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isSystem?: boolean;
  isError?: boolean;
} 