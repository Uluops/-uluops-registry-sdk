/**
 * Analytics types for definition effectiveness, health, and lineage.
 *
 * These types correspond to the Registry API analytics extension endpoints
 * (Phases 1-2). Health scores are provisional pending 90-day calibration.
 */

// ── Shared ────────────────────────────────────────────────────────

export interface FailureDomainDistribution {
  STR: number;
  SEM: number;
  PRA: number;
  EPI: number;
}

export interface HealthFactor {
  factor: string;
  score: number;
  weight: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  detail: string;
  raw?: { value: number; threshold: number };
}

// ── Effectiveness ─────────────────────────────────────────────────

export interface EffectivenessMetrics {
  passRate: number;
  avgScore: number;
  scoreStdDev: number | null;
  issueYield: number;
  falsePositiveRate: number;
  resolutionRate: number;
  regressionRate: number | null;
  avgResolutionTimeHours: number | null;
  failureDomainDistribution: FailureDomainDistribution;
  epistemicDensity: number;
}

export interface ConstituentAgentMetrics {
  type: string;
  name: string;
  independentAvgScore: number | null;
  independentRunCount: number;
}

export interface LiftStatistics {
  standardError: number;
  ci95: [number, number];
  significant: boolean;
  sampleSizes: { pipeline: number; independent: number };
}

export interface CompositionLiftResult {
  compositionLift: number | null;
  pipelineAvgScore: number | null;
  independentMeanScore: number | null;
  constituentAgents: ConstituentAgentMetrics[];
  statistics: LiftStatistics | null;
  caveats: string[];
}

export interface DefinitionEffectiveness {
  definition: { type: string; name: string; version: string };
  period: { start: string; end: string };
  metrics: {
    executionCount: number;
    uniqueProjects: number;
    uniqueUsers: number;
    effectiveness: EffectivenessMetrics | null;
    healthScore: number | null;
    factorCompleteness: number;
    healthFactors: HealthFactor[];
    compositionLift?: CompositionLiftResult | null;
  };
  stale: boolean;
}

// ── Health ─────────────────────────────────────────────────────────

export interface DefinitionHealth {
  definition: { type: string; name: string; version: string };
  healthScore: number | null;
  grade: string | null;
  provisional: boolean;
  caveats: string[];
  issueProfile: {
    failureDomainDistribution: FailureDomainDistribution;
    epistemicDensity: number;
    dominantDomain: string;
    interpretation: string;
  } | null;
  factors: HealthFactor[];
  stale: boolean;
}

// ── Ecosystem ─────────────────────────────────────────────────────

export interface EcosystemOverview {
  definitions: { total: number; byType: Partial<Record<'agent' | 'command' | 'workflow' | 'pipeline', number>> };
  execution: { totalRuns: number | null; uniqueProjects: number | null };
  effectiveness: {
    avgHealthScore: number | null;
    ecosystemTaxonomy: {
      totalIssues: number;
      failureDomainDistribution: FailureDomainDistribution;
      avgEpistemicDensity: number;
    } | null;
    topPerformers: Array<{ type: string; name: string; healthScore: number; epistemicDensity: number }>;
    needsAttention: Array<{ type: string; name: string; healthScore: number; reason: string }>;
  };
  stale: boolean;
}

// ── Lineage ───────────────────────────────────────────────────────

export interface LineageNode {
  type: string;
  name: string;
  version: string;
  ownerId: string;
  relationship: 'root' | 'version' | 'fork';
  healthScore: number | null;
  translatorVersion: string | null;
  status: string;
  createdAt: string | null;
  versions: LineageNode[];
  forks: LineageNode[];
}

export interface LineageResult {
  root: LineageNode;
  totalVersions: number;
  totalForks: number;
  stale: boolean;
}

// ── Evolution ─────────────────────────────────────────────────────

export interface EvolutionPoint {
  version: string;
  publishedAt: string | null;
  translatorVersion: string | null;
  metrics: {
    passRate: number;
    avgScore: number | null;
    runCount: number;
    healthScore: number | null;
  } | null;
}

export interface EvolutionResult {
  definition: { type: string; name: string };
  versions: EvolutionPoint[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  trendConfidence: 'low' | 'medium' | 'high' | null;
  stale: boolean;
}

// ── Translation Analytics ─────────────────────────────────────────

export interface TranslatorGroupMetrics {
  translatorVersion: string;
  isCurrent: boolean;
  versions: string[];
  aggregateMetrics: {
    totalRuns: number;
    avgPassRate: number | null;
    avgScore: number | null;
  };
}

export interface TranslationAnalyticsResult {
  definition: { type: string; name: string };
  currentTranslatorVersion: string;
  groups: TranslatorGroupMetrics[];
  stale: boolean;
}

// ── Compare ───────────────────────────────────────────────────────

export interface VersionComparisonEntry {
  version: string;
  passRate: number;
  avgScore: number | null;
  runCount: number;
  healthScore: number | null;
  translatorVersion: string | null;
}

export interface CompareResult {
  definition: { type: string; name: string };
  versions: VersionComparisonEntry[];
  stale: boolean;
}

// ── Diff Impact ───────────────────────────────────────────────────

export interface DiffImpactResult {
  definition: { type: string; name: string };
  diff: {
    hasChanges: boolean;
    sectionsModified: string[];
    fromLineCount: number;
    toLineCount: number;
  };
  from: { version: string; passRate: number; avgScore: number | null; runCount: number };
  to: { version: string; passRate: number; avgScore: number | null; runCount: number };
  deltas: {
    passRateDelta: number | null;
    avgScoreDelta: number | null;
    runCountDelta: number;
  };
  caveats: string[];
  stale: boolean;
}
