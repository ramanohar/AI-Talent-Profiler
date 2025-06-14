import axios from 'axios';
import { EmployeeProfile, Availability } from '@/types';

// Update these to call our internal API routes
const PROFILES_API = '/api/profiles';
const AVAILABILITY_API = '/api/availability';

export const fetchProfiles = async (): Promise<EmployeeProfile[]> => {
  const response = await axios.get(PROFILES_API);
  return response.data;
};

export const fetchAvailability = async (): Promise<Availability[]> => {
  const response = await axios.get(AVAILABILITY_API);
  return response.data;
}; 