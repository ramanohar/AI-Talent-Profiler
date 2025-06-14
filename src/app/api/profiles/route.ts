import { NextResponse } from 'next/server';

const PROFILES_API_URL = 'https://hackathon-test.azure-api.net/profiles/';

let cachedProfiles: any[] | null = null;
let cacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  if (cachedProfiles && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    console.log('Serving profiles from cache');
    return NextResponse.json(cachedProfiles);
  }

  console.log('Fetching profiles from external API');
  try {
    const response = await fetch(PROFILES_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const profiles = await response.json();
    cachedProfiles = profiles;
    cacheTime = Date.now();
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json({ message: 'Error fetching profiles' }, { status: 500 });
  }
} 