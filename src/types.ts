/**
 * Types for ICT 2024 Mentorship XAUUSD Multi-Timeframe Chart Analysis
 */

export type OperatingMode = 'FULL-MTF' | 'QUICK-READ' | 'REVIEW';

export type TimeframeId = '4H' | '1H' | '30M' | '15M' | '5M' | '1M' | '15S' | 'DXY' | 'XAGUSD';

export type TradeDirection = 'LONG' | 'SHORT' | 'STAND ASIDE';

export type TradeArchetype = 
  | 'P1 — NEWS-SWEEP REVERSAL (08:30 Judas)'
  | 'P2 — SILVER BULLET CONTINUATION (10:00–11:00)'
  | 'P3 — INVERSION REVERSAL'
  | 'P4 — IOFED LRLR CONTINUATION'
  | 'NONE';

export type TradeGrade = 'A' | 'B' | 'STAND ASIDE';

export interface ChartImage {
  id: string;
  timeframe: TimeframeId;
  label: string;
  dataUrl: string; // base64
  fileName: string;
  fileSize?: number;
  uploadedAt: string;
}

export interface SessionContext {
  captureTimeEAT: string; // e.g. "17:15"
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  seasonOffset: 'EDT' | 'EST'; // EDT (UTC-4, EAT - 7h) or EST (UTC-5, EAT - 8h)
  dailyOpenPrice: string; // e.g. "2650.00"
  accountEquity: number; // e.g. 50000
  riskPercent: number; // e.g. 1.0
  customNotes?: string;
  reviewOutcomeNotes?: string;
  calibratedPrices?: {
    currentPrice?: string;
    rangeHigh?: string;
    rangeLow?: string;
    keyArrayCe?: string;
    pdh?: string;
    pdl?: string;
  };
}

export interface ScorecardCriterion {
  id: number;
  label: string;
  description: string;
  met: boolean;
  notes: string;
}

export interface AlgorithmicKeyLevels {
  pdh?: string;
  pdl?: string;
  previousWeekHigh?: string;
  previousWeekLow?: string;
  asiaHigh?: string;
  asiaLow?: string;
  londonHigh?: string;
  londonLow?: string;
  dailyOpen?: string;
  primaryDol?: string;
  alternateDol?: string;
  dealingRangeHigh?: string;
  dealingRangeLow?: string;
  equilibrium50?: string;
  discount25?: string;
  premium75?: string;
  activeFvgZone?: string;
  orderBlockLevel?: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  mode: OperatingMode;
  direction: TradeDirection;
  archetype: TradeArchetype;
  grade: TradeGrade;
  confluenceScore: number; // out of 10
  confidenceScore: number; // 1-10
  ticket: string;
  entryZone: string;
  stopLoss: string;
  stopDistanceDollars: string;
  tp1: string;
  tp2: string;
  rrToTp1: string;
  rrToTp2: string;
  recommendedLots: string;
  riskAmountDollars: string;
  rawOutput: string;
  sections: {
    section1: string; // Session Context & Time Alignment
    section2: string; // Multi-Timeframe Structure & Draw on Liquidity
    section3: string; // Algorithmic Price Array Analysis
    section4: string; // Step-by-Step Trade Setup
    section5: string; // Execution Triggers & Invalidation
    section6: string; // Assumptions, Missing Data & Confidence
  };
  scorecard: ScorecardCriterion[];
  keyLevels: AlgorithmicKeyLevels;
  engineSource?: string;
  reviewAnalysis?: {
    firedArchetype: string;
    levelBehaviors: string;
    triggersFired: string;
    processLesson: string;
  };
}

export interface PresetScenario {
  id: string;
  title: string;
  subtitle: string;
  archetypeTag: string;
  timeContext: string;
  mode: OperatingMode;
  description: string;
  charts: {
    timeframe: TimeframeId;
    label: string;
    url: string;
  }[];
  defaultContext: Partial<SessionContext>;
}
