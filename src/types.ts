/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FeedType = 'STM' | 'AVIATION' | 'MARITIME' | 'CCTV';

export interface FeedItem {
  id: string;
  type: FeedType;
  title: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  value: string; // e.g. "92% flow", "GPS Spoofing", "45 min delay"
  details: string;
  mcpStandardized: boolean;
  image?: string;
}

export interface ToTCritic {
  id: string;
  name: string;
  role: string;
  validityScore: number; // 0 to 100
  weaknesses: string[];
  inconsistencies: string[];
  biases: string[];
  critiqueText: string;
}

export interface ToTBranch {
  id: string;
  name: string; // e.g., "Branch 1: Operations", "Branch 2: Recursion", "Branch 3: ROI"
  description: string;
  evaluationScore: number; // 0 to 100
  uncertainty: number; // 0 to 100 (variance representation)
  recommendation: string;
  cascadingRisks: string[];
  critics?: ToTCritic[];
}

export interface TripleBlindVerification {
  consensusAchieved: boolean;
  verificationSteps: string[];
  agentA_Finding: string;
  agentB_Finding: string;
  agentC_Finding: string;
  dataSegment1_Name?: string;
  dataSegment1_Status?: string;
  dataSegment1_Details?: string;
  dataSegment2_Name?: string;
  dataSegment2_Status?: string;
  dataSegment2_Details?: string;
  dataSegment3_Name?: string;
  dataSegment3_Status?: string;
  dataSegment3_Details?: string;
  isVerifiedTrue100Percent?: boolean;
}

export interface SpecializedAgentMetric {
  label: string;
  value: string;
  status: 'NORMAL' | 'ALERT' | 'CRITICAL';
}

export interface SpecializedAgent {
  name: string;
  codename: 'SENTINELLE-TRANSIT' | 'AERO-VIGIL' | 'AQUA-GARDE' | 'OMNI-VISION';
  status: 'OPTIMIZED' | 'MONITORING' | 'ACTIVE' | 'STANDBY';
  interpretation: string;
  confidenceScore: number; // 0 to 100
  metrics: SpecializedAgentMetric[];
  contributionToToT: string;
}

export interface ToTAnalysisResult {
  id: string;
  feedId: string;
  feedTitle: string;
  feedType: FeedType;
  timestamp: string;
  entropyScore: number; // calculated quantum entropy (0 - 1)
  finalDecision: string;
  branches: ToTBranch[];
  cached: boolean;
  durationMs: number;
  cctvParsing?: string;
  cctvIdentification?: string;
  cctvJudgment?: string;
  cctvTriangulationStatus?: string;
  cctvFinalClassification?: string;
  cctvActionRecommandee?: string;
  tripleBlindVerification?: TripleBlindVerification;
  specializedAgent?: SpecializedAgent;
}

export interface DecisionCacheItem {
  key: string;
  data: ToTAnalysisResult;
  timestamp: number;
}

export interface APIIntegrationLog {
  id: string;
  endpoint: string;
  status: number;
  responseSize: string;
  timestamp: string;
}

export interface RouteStep {
  instruction: string;
  sector: 'STM' | 'AVIATION' | 'MARITIME' | 'CCTV' | 'ROUTE';
  durationMin: number;
}

export interface RouteOption {
  id: string;
  name: string;
  type: 'tot_optimal' | 'high_speed' | 'backup_safe';
  totalDurationMin: number;
  safetyScore: number; // 0 to 100
  steps: RouteStep[];
  description: string;
}
