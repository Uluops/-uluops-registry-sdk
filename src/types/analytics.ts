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

/**
 * One side of the self-reported/independent quality split.
 * Means follow the same voting rules as the headline; `voterCount` counts
 * qualifying actors in the segment, so
 * `independent.voterCount + selfReported.voterCount === provenance.voterCount`.
 */
export interface QualitySegment {
  /** Mean of the segment's per-actor score means; null when the segment has no scored actors */
  runAvgScore: number | null;
  /** Mean of the segment's per-actor pass rates; null when the segment is empty */
  passRate: number | null;
  /** Qualifying actors (>= minActorRuns attributed runs) in this segment */
  voterCount: number;
  /**
   * Actors in the segment's voting population — what the numbers actually rest
   * on. Exceeds voterCount in blend mode (sub-floor actors vote); use THIS for
   * "based on N users" copy, never voterCount (which can honestly be 0 under a
   * real score). Optional: present from registry-api >= 0.52.1.
   */
  actorCount?: number;
}

/**
 * Provenance of the headline quality numbers — who is behind them and how much
 * weight that carries. Present on effectiveness responses from registry-api
 * >= 0.52 (provenance-aware quality analytics); optional for compatibility
 * with older servers.
 */
export interface QualityProvenance {
  /** Distinct attributed actors with runs in the window */
  actorCount: number;
  /** Actors meeting the minActorRuns qualification floor */
  voterCount: number;
  /**
   * 'established' iff voterCount >= 3. Provisional metrics are still computed
   * and returned — thin data reads as thin, not absent. This is an API enum
   * value, not UI copy: render the count ("N users"), not the adjective.
   */
  confidence: 'provisional' | 'established';
  /** The qualification floor, echoed so consumers can render it honestly */
  minActorRuns: number;
  /**
   * Voters whose identity differs from the definition author's — THE headline
   * figure wherever one number is shown. Org-mates count as independent (v1
   * compares user identity only).
   */
  independent?: QualitySegment;
  /** The definition author's own runs — present but labeled */
  selfReported?: QualitySegment;
}

export interface EffectivenessMetrics {
  /**
   * VOTER-WEIGHTED since registry-api 0.52: mean of the voting population's
   * per-actor pass rates — one actor, one vote (0–1). NULL for agents (D11):
   * agent quality is participation-based (snapshot scores across every run
   * the agent appears in) and a whole run's gate result cannot be attributed
   * to one constituent — null means "no data", never 0 ("all failed").
   */
  passRate: number | null;
  /**
   * VOTER-WEIGHTED since registry-api 0.52: mean of the voting population's
   * per-actor score means — one actor's N runs are one vote
   */
  runAvgScore: number;
  /** Std dev over the voting population's actor-means; null below 2 scored voters */
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
  /**
   * 'established' only when both the pipeline side and the pooled constituent
   * side have >= 3 qualifying voters. Label-only — provisional lift is still
   * computed. Present from registry-api >= 0.52.
   */
  confidence?: 'provisional' | 'established';
}

export interface DefinitionEffectiveness {
  definition: { type: string; name: string; version?: string };
  period: { start: string; end: string };
  metrics: {
    executionCount: number;
    uniqueProjects: number;
    /** ALL-TIME distinct-actor count (pairs with the lifetime execution total); provenance counts are windowed */
    uniqueUsers: number;
    /** Who stands behind the quality numbers. Present from registry-api >= 0.52. */
    provenance?: QualityProvenance;
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
    /** Ranked lanes only admit 'established'-confidence definitions from registry-api >= 0.52 */
    topPerformers: Array<{
      type: string; name: string; healthScore: number; epistemicDensity: number;
      /** Actor-diversity confidence from persisted provenance */
      confidence?: 'provisional' | 'established';
      /** ADR-001 hedge: health weight tables are design conjectures pending calibration (renamed from `provisional`) */
      weightsProvisional?: boolean;
    }>;
    needsAttention: Array<{
      type: string; name: string; healthScore: number; reason: string;
      confidence?: 'provisional' | 'established';
      weightsProvisional?: boolean;
    }>;
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
  /**
   * Name-scoped actor provenance. Values on this surface stay RUNS-WEIGHTED by
   * design — this block tells you how many actors stand behind the window.
   * Present from registry-api >= 0.52; absent when the aggregate fetch degrades.
   */
  provenance?: QualityProvenance;
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
  /** Name-scoped actor provenance — values on this surface stay runs-weighted by design. Present from registry-api >= 0.52. */
  provenance?: QualityProvenance;
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
  /** Name-scoped actor provenance — values on this surface stay runs-weighted by design. Present from registry-api >= 0.52. */
  provenance?: QualityProvenance;
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
  /** Name-scoped actor provenance — values on this surface stay runs-weighted by design. Present from registry-api >= 0.52. */
  provenance?: QualityProvenance;
  stale: boolean;
}
