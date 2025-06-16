import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MergedEmployee, mergeEmployeeData, ProfileData, AvailabilityData } from '@/lib/data-utils'; // Import MergedEmployee, mergeEmployeeData, ProfileData, and AvailabilityData
import { ChatMessage } from '@/types';

const openai = new OpenAI({
  apiKey: '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',
});

async function fetchProfiles(): Promise<ProfileData[]> {
  try {
    const res = await fetch('http://localhost:3000/api/profiles');
    if (!res.ok) {
      console.error('Error fetching profiles from internal API:', res.status, res.statusText);
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching profiles:', error);
    // Return an empty array or throw the error depending on desired behavior
    return [];
  }
}

async function fetchAvailability(): Promise<AvailabilityData[]> {
  try {
    // Fetch from our internal API route, which now returns the array directly
    const res = await fetch('http://localhost:3000/api/availability');
    if (!res.ok) {
      console.error('Error fetching availability from internal API:', res.status, res.statusText);
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    // The internal API route /api/availability now returns the array directly
    const availabilityData: AvailabilityData[] = await res.json();
    // console.log('Raw availability data from internal API:', availabilityData); // Remove debugging log
    return availabilityData;
  } catch (error) {
    console.error('Error fetching availability:', error);
    // Return an empty array or throw the error depending on desired behavior
    return [];
  }
}

// Helper functions for scoring (move outside POST)
function getSkillsFromQuery(query: string): string[] {
  const match = query.match(/with ([\w, .-]+)/) || query.match(/in ([\w, .-]+)/) || query.match(/skills?: ([\w, .-]+)/);
  if (match) {
    return match[1].split(/,| and | or /).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}
function getExperienceLevelFromQuery(query: string): string {
  if (query.includes('senior')) return 'senior';
  if (query.includes('lead')) return 'lead';
  if (query.includes('junior')) return 'junior';
  return '';
}
function getDomainFromQuery(query: string): string {
  const domains = ['healthcare', 'finance', 'ecommerce', 'education', 'cloud', 'mobile', 'web'];
  return domains.find(domain => query.includes(domain)) || '';
}
function scoreCandidate(emp: MergedEmployee, requiredSkills: string[], requiredExperience: string, requiredDomain: string, userMessage: string, today: Date): number {
  const allSkills = [
    ...(emp.consultant.additionSkills?.map((s: any) => s.name.toLowerCase()) || []),
    ...(emp.consultant.managedSkills?.map((s: any) => s.name.toLowerCase()) || []),
  ];
  let skillsScore = 0;
  if (requiredSkills.length > 0) {
    const matched = requiredSkills.filter(skill => allSkills.includes(skill));
    skillsScore = (matched.length / requiredSkills.length) * 40;
  }
  let expScore = 0;
  if (requiredExperience) {
    if (emp.title.toLowerCase().includes(requiredExperience)) expScore = 25;
  } else {
    expScore = 15;
  }
  let availScore = 0;
  if (emp.availableFrom) {
    const availDate = new Date(emp.availableFrom);
    const diffDays = (availDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 0) availScore = 20;
    else if (diffDays <= 30) availScore = 15;
    else availScore = 5;
  }
  let domainScore = 0;
  if (requiredDomain) {
    const projects = (emp.consultant.projects || []).map((p: any) => p.primaryName?.toLowerCase() || '').join(' ');
    if (projects.includes(requiredDomain)) domainScore = 10;
  } else {
    domainScore = 5;
  }
  let teamScore = 0;
  if (userMessage.includes('team') && emp.introduction?.toLowerCase().includes('team')) teamScore = 5;
  else teamScore = 2;
  return Math.round(skillsScore + expScore + availScore + domainScore + teamScore);
}

// Intent detection helper
function detectIntent(message: string): { intent: string, candidateName?: string } {
  const lower = message.toLowerCase();
  if (lower.match(/scor(e|ing)|criteria|how.*score/)) {
    return { intent: 'scoring' };
  }
  if (lower.match(/more|show more|next|see more|additional/)) {
    return { intent: 'show_more' };
  }
  // Try to extract a candidate name (e.g., "about Henry Miller", "details for Henry Miller")
  const detailMatch = lower.match(/about ([a-z .'-]+)/) || lower.match(/details? for ([a-z .'-]+)/) || lower.match(/profile ([a-z .'-]+)/);
  if (detailMatch && detailMatch[1]) {
    return { intent: 'candidate_details', candidateName: detailMatch[1].trim() };
  }
  // If the message matches a candidate's name directly
  return { intent: 'new_search' };
}

// Enhanced candidate detail intent detection
function detectCandidateDetailIntent(message: string, candidates: MergedEmployee[]): { intent: string, candidateName?: string } | null {
  const lower = message.toLowerCase();
  const detailPhrases = [
    'tell me more', 'project', 'experience', 'background', 'keen on', 'interested in', 'details', 'profile', 'about'
  ];
  for (const emp of candidates) {
    const name = emp.consultant.displayName.toLowerCase();
    if (lower.includes(name)) {
      // If any detail phrase is present, treat as detail intent
      if (detailPhrases.some(phrase => lower.includes(phrase))) {
        return { intent: 'candidate_details', candidateName: emp.consultant.displayName };
      }
    }
  }
  return null;
}

// Scoring explanation message
const scoringExplanationHTML = `
<b>Scoring Criteria:</b><br/>
<ul>
  <li><b>Skills Match (40%)</b>: Direct skill alignment</li>
  <li><b>Experience Level (25%)</b>: Seniority appropriateness</li>
  <li><b>Availability (20%)</b>: Schedule compatibility</li>
  <li><b>Domain Knowledge (10%)</b>: Industry/project type experience</li>
  <li><b>Team Fit (5%)</b>: Role compatibility</li>
</ul>
`;

// Helper to extract last candidate detail from assistant messages
function getLastCandidateDetail(messages: any[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && msg.role === 'assistant' && msg.content) {
      const match = msg.content.match(/data-last-candidate=['"]([^'"]+)['"]/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  return null;
}

// Helper to detect generic follow-up
function isGenericFollowUp(message: string): boolean {
  const phrases = ['tell me more', 'what else', 'more about him', 'more about her', 'more about them', 'more about this candidate', 'more about this profile', 'more details', 'anything else'];
  return phrases.some(phrase => message.toLowerCase().includes(phrase));
}

// Helper to detect availability request
function isAvailabilityRequest(message: string): boolean {
  const phrases = ['when available', 'availability', 'when can', 'when is', 'available from', 'start date'];
  return phrases.some(phrase => message.toLowerCase().includes(phrase));
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const profiles = await fetchProfiles();
    const availability = await fetchAvailability();
    const mergedData: MergedEmployee[] = mergeEmployeeData(profiles, availability);
    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    // Detect if this is the user's first message and it's a greeting
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    const isFirstMessage = messages.length === 1;
    const isGreeting = greetings.some(greet => userMessage.trim() === greet || userMessage.trim().startsWith(greet + ' '));
    if (isFirstMessage && isGreeting) {
      // Respond with the full welcome message and examples
      const welcomeMessage = `Hello! 👋 I'm your AI hiring assistant, here to help you find the perfect candidates for your needs. I can:\n\n- Search for candidates based on specific skills, experience levels, or domains\n- Provide detailed candidate profiles and availability information\n- Explain how candidates are scored and matched to your requirements\n- Help you refine your search to find better matches\n\nJust let me know what kind of candidate you're looking for, and I'll help you find the best matches! For example, you could ask:\n- "Find me a senior developer with React and Node.js experience"\n- "Show me candidates available in the next month"\n- "I need someone with healthcare domain experience"`;
      return NextResponse.json({
        assistantMessage: {
          role: 'assistant',
          content: welcomeMessage
        }
      });
    }
    const requiredSkills = getSkillsFromQuery(userMessage);
    const requiredExperience = getExperienceLevelFromQuery(userMessage);
    const requiredDomain = getDomainFromQuery(userMessage);
    const today = new Date();
    const scoredCandidates = mergedData.map(emp => ({ ...emp, score: scoreCandidate(emp, requiredSkills, requiredExperience, requiredDomain, userMessage, today) }))
      .sort((a, b) => b.score - a.score);

    // Prepare candidate context for the LLM
    const candidateSummaries = scoredCandidates.slice(0, 10).map(emp => {
      const allSkills = [
        ...(emp.consultant.additionSkills?.map((s: any) => s.name) || []),
        ...(emp.consultant.managedSkills?.map((s: any) => s.name) || [])
      ];
      return `Name: ${emp.consultant.displayName}\nTitle: ${emp.title}\nSkills: ${allSkills.join(', ')}\nLocation: ${emp.consultant.city}, ${emp.consultant.country}\nEmail: ${emp.consultant.email}\nAvailable From: ${emp.availableFrom || 'N/A'}\nProjects: ${(emp.consultant.projects || []).map((p: any) => p.primaryName || p).join(', ') || 'N/A'}\nIntroduction: ${emp.introduction || 'N/A'}`;
    }).join('\n---\n');

    // Find last candidate context if any
    const lastCandidate = getLastCandidateDetail(messages);
    let lastCandidateContext = '';
    if (lastCandidate) {
      const candidate = scoredCandidates.find(emp => emp.consultant.displayName === lastCandidate);
      if (candidate) {
        const allSkills = [
          ...(candidate.consultant.additionSkills?.map((s: any) => s.name) || []),
          ...(candidate.consultant.managedSkills?.map((s: any) => s.name) || [])
        ];
        lastCandidateContext = `\nLast discussed candidate:\nName: ${candidate.consultant.displayName}\nTitle: ${candidate.title}\nSkills: ${allSkills.join(', ')}\nLocation: ${candidate.consultant.city}, ${candidate.consultant.country}\nEmail: ${candidate.consultant.email}\nAvailable From: ${candidate.availableFrom || 'N/A'}\nProjects: ${(candidate.consultant.projects || []).map((p: any) => p.primaryName || p).join(', ') || 'N/A'}\nIntroduction: ${candidate.introduction || 'N/A'}`;
      }
    }

    // Scoring criteria for context
    const scoringCriteria = `Scoring Criteria:\n- Skills Match (40%): Direct skill alignment\n- Experience Level (25%): Seniority appropriateness\n- Availability (20%): Schedule compatibility\n- Domain Knowledge (10%): Industry/project type experience\n- Team Fit (5%): Role compatibility`;

    // Warm, human-like system prompt
    const systemPrompt = `Hello! 👋 I'm your AI hiring assistant, here to help you find the perfect candidates for your needs. I can:

- Search for candidates based on specific skills, experience levels, or domains
- Provide detailed candidate profiles and availability information
- Explain how candidates are scored and matched to your requirements
- Help you refine your search to find better matches

Just let me know what kind of candidate you're looking for, and I'll help you find the best matches! For example, you could ask:
- "Find me a senior developer with React and Node.js experience"
- "Show me candidates available in the next month"
- "I need someone with healthcare domain experience"

${scoringCriteria}\n\nHere are the top candidates for the user's request:\n${candidateSummaries}${lastCandidateContext ? '\n' + lastCandidateContext : ''}`;

    // Prepare messages for LLM
    const messagesWithSystemPrompt = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messagesWithSystemPrompt as any,
      temperature: 0.7,
    });

    const botMessage = completion.choices[0].message.content;

    return NextResponse.json({
      assistantMessage: {
        role: 'assistant',
        content: botMessage
      }
    });
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json({ message: 'An error occurred while processing your request.' }, { status: 500 });
  }
} 