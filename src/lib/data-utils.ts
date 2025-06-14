import { EmployeeProfile, Availability } from '@/types';

// Define a type for the structure of a single profile object, including the nested consultant
export interface ProfileData {
  id: string;
  slugId: string;
  edited: string;
  introduction: string;
  highlightedProjects: any[]; // Use appropriate type if structure is known
  consultant: { // Define the consultant structure
    id: string;
    azureAdId: string;
    displayName: string; // Key for merging
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
    educations: any[]; // Use appropriate type
    certificates: any[]; // Use appropriate type
    projects: any[]; // Use appropriate type
    additionSkills: any[]; // Use appropriate type
    languageSkills: any[]; // Use appropriate type
    managedSkills: any[]; // Use appropriate type
    managedCertificates: any[]; // Use appropriate type
    merits: any[]; // Use appropriate type
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

// Define a type for the structure of a single availability object
export interface AvailabilityData {
  name: string; // Key for merging
  availableFrom: string;
}

// Define the structure of the full availability API response
export interface AvailabilityResponse {
  availableConsultants: AvailabilityData[]; // The array we need
}

// Merged type - combines ProfileData with availability info
export interface MergedEmployee extends ProfileData {
  availableFrom?: string; // Add availableFrom from availability
}

// Update the function to accept ProfileData[] and AvailabilityData[] and merge using displayName and name
export function mergeEmployeeData(profiles: ProfileData[], availability: AvailabilityData[]): MergedEmployee[] {
  const availabilityMap = new Map<string, AvailabilityData>();
  availability.forEach(avail => {
    // Use lowercase names for case-insensitive matching
    availabilityMap.set(avail.name.toLowerCase(), avail);
  });

  const mergedData: MergedEmployee[] = profiles.map(profile => {
    // Use lowercase displayName for case-insensitive matching
    const availData = availabilityMap.get(profile.consultant.displayName.toLowerCase());
    return {
      ...profile,
      availableFrom: availData?.availableFrom, // Add availableFrom if found
    };
  });

  return mergedData;
} 