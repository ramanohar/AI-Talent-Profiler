export interface EmployeeProfile {
  id: string;
  slugId: string;
  edited: string;
  introduction: string;
  highlightedProjects: any[];
  consultant: {
    id: string;
    azureAdId: string;
    displayName: string;
    firstName: string;
    lastName: string;
    username: string;
    country: string;
    city: string;
    email: string;
    isSubcontractor: boolean;
    isActive: boolean;
    isDisabled: boolean;
    primaryLanguage: string;
    educations: any[];
    certificates: any[];
    projects: any[];
    additionSkills: any[];
    languageSkills: any[];
    managedSkills: any[];
    managedCertificates: any[];
    merits: any[];
    title: { id: string; name: string };
    editedTime: string;
    managerDisplayName: string;
    managerOnPremisesUserPrincipalName: string;
    imagePath: string;
    profileId: string;
    profileSlugId: string;
  };
  type: string;
  showLinkedInLink: boolean;
  showExternalLink: boolean;
  showImage: boolean;
  showName: boolean;
  title: string;
  language: string;
}

export interface Availability {
  name: string;
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