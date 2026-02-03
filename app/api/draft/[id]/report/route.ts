/**
 * API Route: Generate AI Draft Report
 * POST /api/draft/[id]/report
 *
 * Sends completed draft data to OpenAI and returns structured analysis
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
    const { draftState, recommendations, winRate } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Build context for OpenAI
    const prompt = buildDraftAnalysisPrompt(draftState, recommendations, winRate);

    // Call OpenAI with structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional League of Legends draft analyst. Analyze draft compositions and provide actionable insights.',
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

    // Structure the report
    const report = {
      draftId: id,
      generatedAt: new Date().toISOString(),
      analysis: {
        summary: analysis.summary || 'Analysis not available',
        blueTeamAnalysis: {
          strengths: analysis.blue_strengths || [],
          weaknesses: analysis.blue_weaknesses || [],
          winConditions: analysis.blue_win_conditions || [],
        },
        redTeamAnalysis: {
          strengths: analysis.red_strengths || [],
          weaknesses: analysis.red_weaknesses || [],
          winConditions: analysis.red_win_conditions || [],
        },
        keyMatchups: analysis.key_matchups || [],
        gameplanRecommendations: {
          blue: analysis.blue_gameplan || [],
          red: analysis.red_gameplan || [],
        },
        predictedOutcome: {
          winner: analysis.predicted_winner || 'blue',
          confidence: analysis.confidence || 0.5,
          reasoning: analysis.reasoning || '',
        },
      },
      stats: {
        blueBans: draftState.blue.bans,
        redBans: draftState.red.bans,
        bluePicks: draftState.blue.picks,
        redPicks: draftState.red.picks,
        finalWinRate: winRate,
      },
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Draft report generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate draft report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function buildDraftAnalysisPrompt(draftState: any, recommendations: any, winRate: any): string {
  return `Analyze this League of Legends draft and provide a comprehensive report in JSON format.

DRAFT DETAILS:
Blue Team:
  Bans: ${draftState.blue.bans.join(', ')}
  Picks: ${draftState.blue.picks.map((p: any) => `${p.champion} (${p.role})`).join(', ')}

Red Team:
  Bans: ${draftState.red.bans.join(', ')}
  Picks: ${draftState.red.picks.map((p: any) => `${p.champion} (${p.role})`).join(', ')}

Win Rate Projection: Blue ${(winRate.blueWinRate * 100).toFixed(1)}% / Red ${(winRate.redWinRate * 100).toFixed(1)}%

Return analysis in this JSON structure:
{
  "summary": "2-3 sentence executive summary of the draft",
  "blue_strengths": ["strength 1", "strength 2", "strength 3"],
  "blue_weaknesses": ["weakness 1", "weakness 2"],
  "blue_win_conditions": ["condition 1", "condition 2"],
  "blue_gameplan": ["step 1", "step 2", "step 3"],
  "red_strengths": ["strength 1", "strength 2", "strength 3"],
  "red_weaknesses": ["weakness 1", "weakness 2"],
  "red_win_conditions": ["condition 1", "condition 2"],
  "red_gameplan": ["step 1", "step 2", "step 3"],
  "key_matchups": [
    {"lane": "Top", "analysis": "..."},
    {"lane": "Jungle", "analysis": "..."},
    {"lane": "Mid", "analysis": "..."},
    {"lane": "Bot", "analysis": "..."},
    {"lane": "Support", "analysis": "..."}
  ],
  "predicted_winner": "blue" or "red",
  "confidence": 0.0 to 1.0,
  "reasoning": "Why you predict this outcome"
}`;
}
