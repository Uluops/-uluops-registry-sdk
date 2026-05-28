/**
 * Analytics types for definition effectiveness, health, and lineage.
 *
 * These types correspond to the Registry API analytics extension endpoints
 * (Phases 1-2). Health scores are provisional pending 90-day calibration.
 */

// ── Shared ────────────────────────────────────────────────────────

export interface FailureDomainDistribution {
  /** Structural issues (missing components, malformed output) */
  STR: number;
  /** Semantic issues (incorrect meaning, wrong values) */
  SEM: number;
  /** Practical issues (inefficiency, fragility, poor DX) */
  PRA: number;
  /** Epistemic issues (overconfidence, ungrounded claims) */
  EPI: number;
}

export interface HealthFactor {
  /** Factor name (e.g., 'pass_rate', 'issue_yield', 'resolution_rate') */
  factor: string;
  /** Normalized score for this factor (0–100) */
  score: number;
  /** Weight in the composite health score calculation */
  weight: number;
  /** Qualitative status derived from the score */
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  /** Human-readable explanation of the score */
  detail: string;
  /** Raw value and threshold used to compute the score */
  raw?: { value: number; threshold: number };
}

// ── Effectiveness ─────────────────────────────────────────────────

export interface EffectivenessMetrics {
  /** Percentage of runs that passed the gate threshold (0–1) */
  passRate: number;
  /** Mean score across all runs */
  runAvgScore: number;
  /** Standard deviation of run scores; null if fewer than 2 runs */
  scoreStdDev: number | null;
  /** Average number of actionable issues found per run */
  issueYield: number;
  /** Proportion of issues later marked as false positives (0–1) */
  falsePositiveRate: number;
  /** Proportion of surfaced issues that were subsequently resolved (0–1) */
  resolutionRate: number;
  /** Rate at which resolved issues reappear; null if insufficient data */
  regressionRate: number | null;
  /** Mean hours from issue creation to resolution; null if no resolutions */
  avgResolutionTimeHours: number | null;
  /** Breakdown of issues across the four failure domains (STR/SEM/PRA/EPI) */
  failureDomainDistribution: FailureDomainDistribution;
  /** Ratio of epistemic (EPI) issues to total issues — higher means more fundamental findings */
  epistemicDensity: number;
}

export interface ConstituentAgentMetrics {
  /** Definition type (agent, command, workflow, pipeline) */
  type: string;
  /** Agent name */
  name: string;
  /** Mean score when run independently (outside pipeline); null if never run independently */
  independentAvgScore: number | null;
  /** Number of independent (non-pipeline) runs */
  independentRunCount: number;
}

export interface LiftStatistics {
  /** Standard error of the lift measurement */
  standardError: number;
  /** 95% confidence interval — index 0 is lower bound, index 1 is upper bound */
  ci95: [number, number];
  /** Whether the lift is statistically significant */
  significant: boolean;
  /** Sample sizes used for the comparison */
  sampleSizes: { pipeline: number; independent: number };
}

export interface CompositionLiftResult {
  /** Score difference between pipeline and independent mean (positive = pipeline is better) */
  compositionLift: number | null;
  /** Mean score when agents run as part of this pipeline */
  pipelineAvgScore: number | null;
  /** Mean score across constituent agents' independent runs */
  independentMeanScore: number | null;
  /** Per-agent independent performance data */
  constituentAgents: ConstituentAgentMetrics[];
  /** Statistical significance test results; null if insufficient data */
  statistics: LiftStatistics | null;
  /** Explanatory notes about data limitations or methodology */
  caveats: string[];
}

export interface DefinitionEffectiveness {
  definition: { type: string; name: string; version?: string };
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

/**
 * Inherited health baseline from source definition at fork time.
 *
 * When a definition is forked, the source's current health score is captured
 * as a transparent baseline. This gives consumers an initial trust signal for
 * forks that contain identical content to a measured source. The baseline is
 * explicitly labeled as inherited, not earned.
 */
export interface InheritedBaseline {
  /** Source's health score at fork time (0-100). */
  healthScore: number;
  /** Source's grade at fork time (A-F). */
  grade: string;
  /** Source definition identity. */
  source: { type: string; name: string; version: string };
  /** When the baseline was captured (ISO 8601). */
  inheritedAt: string;
  /** 'active' = fork has insufficient own data; 'superseded' = fork has its own computed health. */
  status: 'active' | 'superseded';
}

/**
 * Health assessment for a definition.
 *
 * **Provisionality:** Health scores are computed from factor weights that have
 * not yet been validated against real-world outcomes. When `provisional` is true,
 * the `healthScore` and `grade` reflect the current weighting model but should not
 * be treated as calibrated measurements. The `caveats` array contains specific
 * warnings (e.g., `'PROVISIONAL: factor weights unvalidated'`). Consuming code
 * should surface `provisional` status to users rather than presenting scores as
 * authoritative.
 */
export interface DefinitionHealth {
  definition: { type: string; name: string; version?: string };
  healthScore: number | null;
  grade: string | null;
  /** True when factor weights are unvalidated — scores are directional, not calibrated. */
  provisional: boolean;
  /** Machine-readable warnings about score reliability and data completeness. */
  caveats: string[];
  issueProfile: {
    failureDomainDistribution: FailureDomainDistribution;
    epistemicDensity: number;
    dominantDomain: string;
    interpretation: string;
  } | null;
  factors: HealthFactor[];
  /** Inherited health baseline from source definition, if this is a fork. */
  inheritedBaseline?: InheritedBaseline;
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
  authorId: string;
  relationship: 'root' | 'version' | 'fork';
  healthScore: number | null;
  translatorVersion: string | null;
  status: string;
  createdAt: string | null;
  versions: LineageNode[];
  forks: LineageNode[];
}

export interface LineageStatistics {
  totalExecutions: number;
  activeVariants: number;
  mostForked: { name: string; version: string; forkCount: number } | null;
  mostExecuted: { name: string; version: string; executionCount: number } | null;
  highestEffectiveness: { name: string; version: string; healthScore: number } | null;
}

export interface LineageResult {
  root: LineageNode;
  totalVersions: number;
  totalForks: number;
  statistics: LineageStatistics;
  stale: boolean;
}

// ── Evolution ─────────────────────────────────────────────────────

export interface EvolutionPoint {
  version: string;
  publishedAt: string | null;
  translatorVersion: string | null;
  /** Human-readable summary of structural changes from previous version. Null for first version. */
  changeSummary: string | null;
  metrics: {
    passRate: number;
    runAvgScore: number | null;
    runCount: number;
    healthScore: number | null;
  } | null;
}

export interface OverallTrend {
  trajectory: 'consistent_improvement' | 'consistent_decline' | 'stable' | 'volatile' | 'insufficient_data';
  passRateChange: string | null;
  runAvgScoreChange: string | null;
  epistemicDensityChange: string | null;
}

export interface EvolutionResult {
  definition: { type: string; name: string };
  versions: EvolutionPoint[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  trendConfidence: 'low' | 'medium' | 'high' | null;
  overallTrend: OverallTrend;
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
    runAvgScore: number | null;
  };
}

export interface ProjectedImprovement {
  passRateDelta: number;
  runAvgScoreDelta: number;
}

export interface TranslationAnalyticsResult {
  definition: { type: string; name: string };
  currentTranslatorVersion: string;
  groups: TranslatorGroupMetrics[];
  upgradeAvailable: boolean;
  projectedImprovement: ProjectedImprovement | null;
  recommendation: string | null;
  stale: boolean;
}

// ── Compare ───────────────────────────────────────────────────────

export interface VersionComparisonEntry {
  version: string;
  passRate: number;
  runAvgScore: number | null;
  runCount: number;
  healthScore: number | null;
  translatorVersion: string | null;
  failureDomainDistribution: FailureDomainDistribution | null;
  epistemicDensity: number | null;
}

export interface CompareResult {
  definition: { type: string; name: string };
  versions: VersionComparisonEntry[];
  stale: boolean;
}

// ── Diff Impact ───────────────────────────────────────────────────

export interface CategorizedChange {
  category: 'scoring' | 'criteria' | 'output' | 'metadata' | 'behavior' | 'other';
  section: string;
  changeType: 'added' | 'removed' | 'modified';
}

export interface TaxonomyShift {
  from: FailureDomainDistribution;
  to: FailureDomainDistribution;
  delta: FailureDomainDistribution;
  epistemicDensityDelta: number;
}

export interface DiffImpactResult {
  definition: { type: string; name: string };
  diff: {
    hasChanges: boolean;
    sectionsAdded: string[];
    sectionsRemoved: string[];
    sectionsModified: string[];
    fromLineCount: number;
    toLineCount: number;
  };
  from: { version: string; passRate: number; runAvgScore: number | null; runCount: number };
  to: { version: string; passRate: number; runAvgScore: number | null; runCount: number };
  deltas: {
    passRateDelta: number | null;
    runAvgScoreDelta: number | null;
    runCountDelta: number;
  };
  categorizedChanges: CategorizedChange[];
  taxonomyShift: TaxonomyShift | null;
  caveats: string[];
  stale: boolean;
}
