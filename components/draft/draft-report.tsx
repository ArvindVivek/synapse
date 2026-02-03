'use client';

/**
 * Draft Report Component
 * Displays AI-generated draft analysis with sharing and download options
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/toast';
import ReactMarkdown from 'react-markdown';
import { Download, Share2, Loader2, TrendingUp, TrendingDown, Target } from '@/components/ui/icons';
import type { DraftState } from '@/lib/draft/types';

interface DraftReportProps {
  draftId: string;
  draftState: DraftState;
}

interface DraftReport {
  draftId: string;
  generatedAt: string;
  analysis: {
    summary: string;
    blueTeamAnalysis: {
      strengths: string[];
      weaknesses: string[];
      winConditions: string[];
    };
    redTeamAnalysis: {
      strengths: string[];
      weaknesses: string[];
      winConditions: string[];
    };
    keyMatchups: Array<{ lane: string; analysis: string }>;
    gameplanRecommendations: {
      blue: string[];
      red: string[];
    };
    predictedOutcome: {
      winner: 'blue' | 'red';
      confidence: number;
      reasoning: string;
    };
  };
  stats: any;
}

export function DraftReport({ draftId, draftState }: DraftReportProps) {
  const [report, setReport] = useState<DraftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    generateReport();
  }, [draftId]);

  const generateReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/draft/${draftId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftState,
          recommendations: [], // Include recommendation data
          winRate: { blueWinRate: 0.52, redWinRate: 0.48 }, // Include win rate data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;

    const markdown = generateMarkdownReport(report);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `draft-report-${draftId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    // Generate shareable URL (would need to implement URL shortener/storage)
    const url = `${window.location.origin}/draft/${draftId}/report`;
    setShareUrl(url);
    await navigator.clipboard.writeText(url);
    alert('Share URL copied to clipboard!');
  };

  if (loading) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Generating AI Report...</h3>
            <p className="text-sm text-gray-400 mt-2">Analyzing draft composition and matchups</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center text-red-400">
          <p>Failed to generate report: {error}</p>
          <Button onClick={generateReport} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!report) return null;

  const { analysis } = report;
  const userSide = draftState.userSide;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Draft Analysis Report</h2>
        <div className="flex gap-2">
          <Button onClick={handleShare} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-3">Executive Summary</h3>
        <p className="text-gray-300">{analysis.summary}</p>
      </Card>

      {/* Predicted Outcome */}
      <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-red-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-2">Predicted Outcome</h3>
            <p className="text-2xl font-bold">
              {analysis.predictedOutcome.winner.toUpperCase()} Side Victory
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Confidence: {(analysis.predictedOutcome.confidence * 100).toFixed(0)}%
            </p>
          </div>
          <Target className="h-16 w-16 opacity-50" />
        </div>
        <p className="text-sm text-gray-300 mt-4">{analysis.predictedOutcome.reasoning}</p>
      </Card>

      {/* Team Analysis - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blue Team */}
        <Card className="p-6 border-blue-500/20">
          <h3 className="font-semibold text-lg mb-4 text-blue-400">Blue Team Analysis</h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {analysis.blueTeamAnalysis.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                Weaknesses
              </h4>
              <ul className="space-y-1">
                {analysis.blueTeamAnalysis.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Win Conditions</h4>
              <ul className="space-y-1">
                {analysis.blueTeamAnalysis.winConditions.map((w, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400">→</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Game Plan</h4>
              <ol className="space-y-1">
                {analysis.gameplanRecommendations.blue.map((step, i) => (
                  <li key={i} className="text-sm text-gray-300">
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>

        {/* Red Team */}
        <Card className="p-6 border-red-500/20">
          <h3 className="font-semibold text-lg mb-4 text-red-400">Red Team Analysis</h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {analysis.redTeamAnalysis.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                Weaknesses
              </h4>
              <ul className="space-y-1">
                {analysis.redTeamAnalysis.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Win Conditions</h4>
              <ul className="space-y-1">
                {analysis.redTeamAnalysis.winConditions.map((w, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-400">→</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Game Plan</h4>
              <ol className="space-y-1">
                {analysis.gameplanRecommendations.red.map((step, i) => (
                  <li key={i} className="text-sm text-gray-300">
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      </div>

      {/* Key Matchups */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Key Lane Matchups</h3>
        <div className="space-y-3">
          {analysis.keyMatchups.map((matchup, i) => (
            <div key={i} className="border-l-2 border-gray-700 pl-4">
              <h4 className="font-semibold text-sm mb-1">{matchup.lane}</h4>
              <p className="text-sm text-gray-300">{matchup.analysis}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Draft Stats */}
      <Card className="p-6 bg-gray-800/50">
        <h3 className="font-semibold text-lg mb-4">Draft Summary</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-blue-400 font-semibold mb-2">Blue Team</h4>
            <p className="text-xs text-gray-400 mb-1">Bans:</p>
            <p className="text-sm mb-3">{report.stats.blueBans.join(', ')}</p>
            <p className="text-xs text-gray-400 mb-1">Picks:</p>
            <p className="text-sm">
              {report.stats.bluePicks.map((p: any) => `${p.champion} (${p.role})`).join(', ')}
            </p>
          </div>
          <div>
            <h4 className="text-red-400 font-semibold mb-2">Red Team</h4>
            <p className="text-xs text-gray-400 mb-1">Bans:</p>
            <p className="text-sm mb-3">{report.stats.redBans.join(', ')}</p>
            <p className="text-xs text-gray-400 mb-1">Picks:</p>
            <p className="text-sm">
              {report.stats.redPicks.map((p: any) => `${p.champion} (${p.role})`).join(', ')}
            </p>
          </div>
        </div>
      </Card>

      <div className="text-center text-sm text-gray-500 pt-4">
        Report generated at {new Date(report.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}

function generateMarkdownReport(report: DraftReport): string {
  const { analysis } = report;

  return `# Draft Analysis Report

**Generated:** ${new Date(report.generatedAt).toLocaleString()}
**Draft ID:** ${report.draftId}

## Executive Summary

${analysis.summary}

## Predicted Outcome

**Winner:** ${analysis.predictedOutcome.winner.toUpperCase()} Side
**Confidence:** ${(analysis.predictedOutcome.confidence * 100).toFixed(0)}%

${analysis.predictedOutcome.reasoning}

## Blue Team Analysis

### Strengths
${analysis.blueTeamAnalysis.strengths.map(s => `- ${s}`).join('\n')}

### Weaknesses
${analysis.blueTeamAnalysis.weaknesses.map(w => `- ${w}`).join('\n')}

### Win Conditions
${analysis.blueTeamAnalysis.winConditions.map(w => `- ${w}`).join('\n')}

### Game Plan
${analysis.gameplanRecommendations.blue.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Red Team Analysis

### Strengths
${analysis.redTeamAnalysis.strengths.map(s => `- ${s}`).join('\n')}

### Weaknesses
${analysis.redTeamAnalysis.weaknesses.map(w => `- ${w}`).join('\n')}

### Win Conditions
${analysis.redTeamAnalysis.winConditions.map(w => `- ${w}`).join('\n')}

### Game Plan
${analysis.gameplanRecommendations.red.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Key Lane Matchups

${analysis.keyMatchups.map(m => `### ${m.lane}\n${m.analysis}`).join('\n\n')}

---

*Generated with AI - Cloud9 x JetBrains Hackathon 2026*
`;
}
