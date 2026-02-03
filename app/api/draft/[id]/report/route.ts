/**
 * API Route: Generate AI Draft Report
 * POST /api/draft/[id]/report
 *
 * Sends completed draft data to OpenAI and returns structured analysis
 * Returns data in format matching DraftReportModal component
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { blue, red, userSide } = body;

    // Use OpenAI when API key is available, otherwise fall back to mock data
    const useMockData = !process.env.OPENAI_API_KEY;

    if (useMockData) {
      // Return mock report matching DraftReportModal structure
      const mockReport = generateMockReport(blue, red, userSide);
      return NextResponse.json(mockReport);
    }

    // OpenAI Integration
    const prompt = buildDraftAnalysisPrompt(blue, red, userSide);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional League of Legends draft analyst. Analyze draft compositions and provide actionable insights for competitive play.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const analysisText = completion.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(analysisText);

    // Map OpenAI response to our modal structure
    const report = mapOpenAIToReportStructure(analysis, userSide);
    return NextResponse.json(report);
  } catch (error) {
    console.error('Draft report generation error:', error);

    // Fallback to mock data on error
    const body = await request.json();
    const mockReport = generateMockReport(body.blue, body.red, body.userSide);
    return NextResponse.json(mockReport);
  }
}

/**
 * Generate mock report matching DraftReportModal structure
 */
function generateMockReport(blue: any, red: any, userSide: 'blue' | 'red') {
  const userTeam = userSide === 'blue' ? blue : red;
  const userChampions = userTeam.picks.map((p: any) => p.champion).join(', ') || 'No picks';

  // Calculate win probability (simple mock heuristic)
  const baseWinRate = userSide === 'blue' ? 52 : 48; // Blue side advantage
  const grade = determineGrade(userTeam);

  return {
    summary: {
      winProbability: baseWinRate,
      draftGrade: grade,
      keyStrengths: [
        `Strong team synergy with champions: ${userChampions}`,
        'Balanced damage profile with both AP and AD threats',
        'Excellent scaling potential with multiple win conditions',
      ],
    },
    strategicAnalysis: {
      teamComp:
        'Balanced engage composition with strong team fighting and pick potential. Features early-to-mid game power spikes with scaling insurance.',
      winConditions: [
        'Establish early vision control and secure objective priority',
        'Create picks through coordinated roams and jungle pressure',
        'Force advantageous team fights around Baron after item spikes',
      ],
      powerSpikes: [
        'Level 6: Major ultimates enable coordinated plays and dives',
        'Two Items: Core items reached for team fight dominance',
        'Level 16: Late game insurance with ultimate upgrades',
      ],
    },
    matchupInsights: {
      lanes: [
        {
          role: 'Top Lane',
          matchup: 'Skill-dependent with outplay potential',
          advantage: 'favorable' as const,
          tips: 'Play aggressively levels 1-3. Freeze wave and zone from CS. Set up dives with jungle at level 6.',
        },
        {
          role: 'Jungle',
          matchup: 'Mirror pathing recommended',
          advantage: 'even' as const,
          tips: 'Contest scuttle but avoid extended fights. Track enemy and counter-gank mid lane.',
        },
        {
          role: 'Mid Lane',
          matchup: 'Favorable with wave control',
          advantage: 'favorable' as const,
          tips: 'Abuse range advantage. Push and roam after securing priority. Ward enemy jungle.',
        },
        {
          role: 'Bot Lane',
          matchup: 'Respect enemy kill pressure',
          advantage: 'unfavorable' as const,
          tips: 'Play safe and farm until two items. Request jungle assistance. Respect engage range.',
        },
        {
          role: 'Support',
          matchup: 'Vision control is key',
          advantage: 'even' as const,
          tips: 'Establish deep vision. Look for roam timers to mid/jungle. Save disengage tools.',
        },
      ],
      junglePathing:
        'Start bot side for leash advantage. Full clear into scuttle contest. Look for mid gank at level 3 if pushed. Mirror enemy to prevent dives.',
      objectivePriorities: [
        'First Drake (Mountain/Cloud priority)',
        'Herald for mid lane pressure',
        'Third Drake for soul point',
        'Baron with item advantage',
      ],
    },
    recommendations: {
      earlyGame: [
        'Establish bot side vision before 3:15 for scuttle control',
        'Coordinate level 6 dive on weakest lane matchup',
        'Secure first drake before 6 minutes if uncontested',
        'Deny enemy jungle camps when safe',
      ],
      midGame: [
        'Group for Herald and crash mid wave for plates',
        'Set up vision for pick plays in enemy jungle',
        'Force 4v2 dives on sidelane with TP advantage',
        'Secure third drake for soul point control',
      ],
      lateGame: [
        'Split push with TP threat for Baron setup',
        'Contest Elder Drake with vision advantage',
        'Force Baron with numbers from picks',
        'Avoid extended fights until cores completed',
      ],
    },
  };
}

/**
 * Determine draft grade based on pick quality
 */
function determineGrade(team: any): 'S' | 'A' | 'B' | 'C' | 'D' {
  const pickCount = team.picks?.length || 0;

  // Simple heuristic - can be improved with actual analysis
  if (pickCount >= 5) return 'A';
  if (pickCount >= 4) return 'B';
  if (pickCount >= 3) return 'C';
  return 'D';
}

/**
 * Build OpenAI prompt for draft analysis (for future integration)
 */
function buildDraftAnalysisPrompt(blue: any, red: any, userSide: 'blue' | 'red'): string {
  return `Analyze this League of Legends professional draft and provide a comprehensive report.

DRAFT DETAILS:
Blue Team:
  Bans: ${blue.bans?.join(', ') || 'None'}
  Picks: ${blue.picks?.map((p: any) => `${p.champion} (${p.role || 'flex'})`).join(', ') || 'None'}

Red Team:
  Bans: ${red.bans?.join(', ') || 'None'}
  Picks: ${red.picks?.map((p: any) => `${p.champion} (${p.role || 'flex'})`).join(', ') || 'None'}

User is playing: ${userSide.toUpperCase()} side

Return analysis in this JSON structure matching our modal requirements:
{
  "summary": {
    "winProbability": 45-55,
    "draftGrade": "S|A|B|C|D",
    "keyStrengths": ["strength 1", "strength 2", "strength 3"]
  },
  "strategicAnalysis": {
    "teamComp": "Description of composition style and identity",
    "winConditions": ["condition 1", "condition 2", "condition 3"],
    "powerSpikes": ["spike 1", "spike 2", "spike 3"]
  },
  "matchupInsights": {
    "lanes": [
      {
        "role": "Top Lane",
        "matchup": "Description",
        "advantage": "favorable|even|unfavorable",
        "tips": "Lane-specific advice"
      }
      // ... for all 5 lanes
    ],
    "junglePathing": "Jungle strategy description",
    "objectivePriorities": ["priority 1", "priority 2", "priority 3", "priority 4"]
  },
  "recommendations": {
    "earlyGame": ["tip 1", "tip 2", "tip 3", "tip 4"],
    "midGame": ["tip 1", "tip 2", "tip 3", "tip 4"],
    "lateGame": ["tip 1", "tip 2", "tip 3", "tip 4"]
  }
}`;
}

/**
 * Map OpenAI response to DraftReportModal structure
 */
function mapOpenAIToReportStructure(analysis: any, userSide: 'blue' | 'red') {
  return {
    summary: {
      winProbability: analysis.summary?.winProbability || 50,
      draftGrade: analysis.summary?.draftGrade || 'B',
      keyStrengths: analysis.summary?.keyStrengths || [
        'Balanced team composition',
        'Strong scaling potential',
        'Multiple win conditions'
      ],
    },
    strategicAnalysis: {
      teamComp: analysis.strategicAnalysis?.teamComp || 'Standard team composition with balanced damage profile.',
      winConditions: analysis.strategicAnalysis?.winConditions || [
        'Establish early game advantage',
        'Secure objective control',
        'Win team fights'
      ],
      powerSpikes: analysis.strategicAnalysis?.powerSpikes || [
        'Level 6 ultimate abilities',
        'Two item power spike',
        'Late game scaling'
      ],
    },
    matchupInsights: {
      lanes: analysis.matchupInsights?.lanes || [
        {
          role: 'Top Lane',
          matchup: 'Skill matchup',
          advantage: 'even' as const,
          tips: 'Focus on farming and scaling.'
        },
        {
          role: 'Jungle',
          matchup: 'Neutral matchup',
          advantage: 'even' as const,
          tips: 'Track enemy jungler and secure objectives.'
        },
        {
          role: 'Mid Lane',
          matchup: 'Skill matchup',
          advantage: 'even' as const,
          tips: 'Maintain wave control and roam when possible.'
        },
        {
          role: 'Bot Lane',
          matchup: 'Scaling matchup',
          advantage: 'even' as const,
          tips: 'Play safe and farm until power spikes.'
        },
        {
          role: 'Support',
          matchup: 'Vision matchup',
          advantage: 'even' as const,
          tips: 'Establish vision control and look for roams.'
        },
      ],
      junglePathing: analysis.matchupInsights?.junglePathing || 'Standard clear with objective priority.',
      objectivePriorities: analysis.matchupInsights?.objectivePriorities || [
        'First Drake',
        'Rift Herald',
        'Third Drake for soul point',
        'Baron with advantage'
      ],
    },
    recommendations: {
      earlyGame: analysis.recommendations?.earlyGame || [
        'Secure vision control',
        'Focus on farming',
        'Look for gank opportunities',
        'Contest early objectives'
      ],
      midGame: analysis.recommendations?.midGame || [
        'Group for objectives',
        'Establish vision control',
        'Look for picks',
        'Secure soul point'
      ],
      lateGame: analysis.recommendations?.lateGame || [
        'Setup for Baron',
        'Contest Elder Drake',
        'Force favorable fights',
        'Close out the game'
      ],
    },
  };
}
