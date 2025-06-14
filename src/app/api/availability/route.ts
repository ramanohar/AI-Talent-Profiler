import { NextResponse } from 'next/server';

const AVAILABILITY_API_URL = 'https://hackathon-test.azure-api.net/availability';

let cachedAvailability: any[] | null = null; // Cache the array of consultants
let cacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  // Check if cached data exists and is still valid
  if (cachedAvailability && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    console.log('Serving availability from cache');
    return NextResponse.json(cachedAvailability); // Return the cached array
  }

  console.log('Fetching availability from external API');
  try {
    const response = await fetch(AVAILABILITY_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Extract the array from the nested structure
    const availabilityArray = data.availableConsultants;

    // Check if extraction was successful and it's an array
    if (!Array.isArray(availabilityArray)) {
        console.error('Fetched data does not contain an array under availableConsultants:', data);
        throw new Error('Invalid data structure from availability API');
    }

    // Cache the extracted array
    cachedAvailability = availabilityArray;
    cacheTime = Date.now();

    return NextResponse.json(availabilityArray); // Return the extracted array
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ message: 'Error fetching availability' }, { status: 500 });
  }
} 