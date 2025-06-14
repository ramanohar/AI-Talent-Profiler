'use client';

import { useEffect, useState } from 'react';
import { fetchProfiles, fetchAvailability } from '@/services/api';
import { ChatMessage, EmployeeProfile, Availability } from '@/types';
import { MergedEmployee, mergeEmployeeData, ProfileData, AvailabilityData } from '@/lib/data-utils';

export default function TestEndpoints() {
  const [mergedData, setMergedData] = useState<MergedEmployee[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testEndpoints = async () => {
      try {
        const profilesData = await fetchProfiles() as unknown as ProfileData[];
        const availabilityData = await fetchAvailability() as unknown as AvailabilityData[];
        
        const merged = mergeEmployeeData(profilesData, availabilityData);
        setMergedData(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    testEndpoints();
  }, []);

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Merged Employee Data:</h2>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[400px]">
        {JSON.stringify(mergedData, null, 2)}
      </pre>
    </div>
  );
} 