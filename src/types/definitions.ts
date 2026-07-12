/**
 * Definition entity types for the Registry SDK
 */

import type {
  AgentType,
  ChangeType,
  DefinitionStatus,
  DefinitionType,
  Domain,
  SortField,
  SortOrder,
  SubscriptionTier,
  Tier,
  Visibility,
} from './enums.js';

// ── Definition Reference ─────────────────────────────────────

/**
 * Compact reference to a specific definition version.
 *
 * Reduces the (type, name, version) ceremony when passing definition
 * identifiers between functions. Destructure with spread:
 *
 * ```ts
 * const ref: DefinitionRef = { type: 'agent', name: 'code-validator', version: '1.0.0' };
 * const def = await client.definitions.get(ref.type, ref.name, ref.version);
 * ```
 */
export interface DefinitionRef {
  type: DefinitionType;
  name: string;
  version: string;
}

// ── Safety Analysis Types ────────────────────────────────────

export type SignalSeverity = 'medium' | 'high';
export type RiskLevel = 'none' | 'medium' | 'high';

export interface SafetySignal {
  id: string;
  severity: SignalSeverity;
  title: string;
  detail: string;
  location?: string;
}

export interface DefinitionCapabilities {
  tools: string[];
  preflightCommands: number;
  maxTokens?: number;
  temperature?: number;
  agentType?: string;
}

export interface SyncScanResult {
  version: string;
  scannedAt: string;
  capabilities: DefinitionCapabilities;
  signals: SafetySignal[];
  riskLevel: RiskLevel;
}

export interface DeepFinding {
  id: string;
  severity: SignalSeverity;
  confidence: number;
  title: string;
  detail: string;
  category: 'injection' | 'exfiltration' | 'escalation' | 'resource' | 'dependency' | 'behavioral';
  location?: string;
}

/**
 * Deep-analysis outcome status. Mirrors the sync-side ScanStatus discipline so a
 * failed/unparseable agent run is distinguishable from a genuine clean verdict.
 *
 * - 'analyzed' — the bridge agent ran and produced a parseable verdict.
 * - 'error' — output missing/unparseable/schema-invalid; an empty `findings` and
 *   `riskLevel: 'none'` do NOT mean the definition is clean.
 *
 * Absent on legacy rows — treat as 'analyzed'.
 */
export type DeepAnalysisOutcomeStatus = 'analyzed' | 'error';

export type DeepAnalysisErrorReason =
  | 'no_output'
  | 'no_json'
  | 'parse_error'
  | 'invalid_schema'
  | 'inconsistent_verdict'
  | 'timeout';

export interface DeepAnalysisResult {
  version: string;
  analyzedAt: string;
  findings: DeepFinding[];
  riskLevel: RiskLevel;
  /**
   * Outcome of the deep analysis run. Absent on legacy rows — treat as
   * 'analyzed'. When 'error', an empty `findings` / `riskLevel: 'none'` is NOT a
   * safety judgment; consumers must check status before treating deep as clean.
   */
  status?: DeepAnalysisOutcomeStatus;
  errorReason?: DeepAnalysisErrorReason;
}

/**
 * Sync-scan outcome status.
 *
 * - 'complete' — scanner ran end-to-end; signals reflect actual evidence.
 * - 'failed' — scanner aborted (parse error, timeout, internal). The absence of
 *   signals does NOT imply the definition is safe.
 *
 * Absent on legacy rows (pre-A2) — treat as 'complete'.
 */
export type ScanStatus = 'complete' | 'failed';

export type ScanFailedReason = 'parse_error' | 'timeout' | 'internal';

export interface RiskProfile {
  sync: SyncScanResult;
  deep: DeepAnalysisResult | null;
  aggregateRiskLevel: RiskLevel;
  lastUpdated: string;
  /**
   * Sync scan outcome. Absent on legacy rows — treat as 'complete'. When
   * 'failed', `aggregateRiskLevel: 'none'` does NOT mean the definition is
   * clean; it means the scan could not determine. Consumers must gate on this
   * (see {@link isVerdictTrustworthy}) before rendering a verdict.
   */
  scanStatus?: ScanStatus;
  scanFailedReason?: ScanFailedReason;
}

/**
 * Whether a risk profile's verdict can be trusted as a safety judgment.
 *
 * Returns false when analysis did not complete on some layer — a failed sync
 * scan (`scanStatus: 'failed'`), an errored deep analysis
 * (`deep.status: 'error'`), or an absent/null profile (never scanned). When
 * this is false, `aggregateRiskLevel` is a sentinel, not a verdict — consumers
 * MUST NOT read 'none' as "clean" and should surface a "scan incomplete /
 * could not determine" state instead.
 *
 * Deep dimension: `deep.status: 'error'` is written only when the deep agent
 * ran and its output failed extraction. A skipped (private) or not-yet-analyzed
 * definition has `deep: null`, which stays trustworthy — only the explicit
 * error state flips trust, so freshly published definitions awaiting the async
 * worker are not falsely marked untrusted.
 *
 * This is the consumer-side mirror of the registry-api predicate of the same
 * name (deep-aware since the ADR-010 2026-07-10 revision); centralizing it here
 * stops the CLI and every other SDK consumer from re-implementing the sentinel
 * checks and drifting.
 */
export function isVerdictTrustworthy(profile: RiskProfile | null | undefined): boolean {
  return profile != null
    && profile.scanStatus !== 'failed'
    && profile.deep?.status !== 'error';
}

// ── Provenance Types ──────────────────────────────────────────

export type AuthorshipType = 'human' | 'agent' | 'collaborative' | 'automated';
export type ContributorRole = 'author' | 'optimizer' | 'reviewer' | 'editor' | 'publisher';
export type ActorType = 'human' | 'agent';

export interface Contributor {
  id: string;
  role: ContributorRole;
  type: ActorType;
  name?: string;
  agentName?: string;
  contributedAt?: string;
}

export interface Provenance {
  authorshipType: AuthorshipType;
  contributors: Contributor[];
  dialecticRounds?: number;
  optimizationRunId?: string;
}

/**
 * Full definition entity returned from the API
 */
export interface Definition {
  id: string;
  type: DefinitionType;
  name: string;
  version: string;
  status: DefinitionStatus;
  /** Raw YAML source in UDL format (ADL/CDL/WDL/PDL). Null when content-gated. */
  yaml?: string | null;
  /** SHA-256 hash of the YAML content — used for change detection */
  hash: string;
  displayName: string;
  description: string;
  domain: Domain;
  subdomain?: string | null;
  agentType?: AgentType | null;
  author?: string | null;
  provenance?: Provenance | null;
  tags?: string[] | null;
  authorId: string;
  /** Org that owns this definition */
  orgId?: string | null;
  /** Org-scoped namespace (e.g., @ulu-labs/code-validator). Null if no org context. */
  namespace?: string | null;
  tier: Tier;
  /** Minimum subscription tier required to access content */
  minSubscription?: SubscriptionTier | null;
  /** True when content was stripped by content gating (yaml/runtimeMd will be null) */
  proRestricted?: boolean;
  visibility: Visibility;
  /** Rendered markdown output from the UDL translator. Null when content-gated. */
  runtimeMd?: string | null;
  /** SHA-256 hash of the rendered prompt content — distinct from yaml hash */
  promptHash?: string | null;
  /** UDL translator version used to render this definition (e.g., '4.1.0') */
  translatorVersion?: string | null;
  /** ADL/CDL/WDL/PDL schema version the YAML conforms to (e.g., 'v1.13.0') */
  schemaVersion?: string | null;
  /** Normalized definition in runtime-ready shape (present when ?normalize=true) */
  normalized?: Record<string, unknown> | null;
  /** Error message if normalization failed (present when normalized is null) */
  normalizationError?: string;
  executionCount: number;
  uniqueExecutionCount: number;
  forkCount: number;
  starCount: number;
  /** UUID of the source definition this was forked from. Null if original. */
  forkedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  deprecatedAt?: string | null;
  /** Safety analysis results — null when not yet analyzed */
  riskProfile?: RiskProfile | null;
}

/**
 * Lightweight definition for list responses
 */
export interface DefinitionListItem {
  id: string;
  type: DefinitionType;
  name: string;
  version: string;
  status: DefinitionStatus;
  displayName: string;
  description: string;
  domain: Domain;
  agentType?: AgentType | null;
  authorId: string;
  orgId?: string | null;
  tier: Tier;
  /** Minimum subscription tier required to access content */
  minSubscription?: SubscriptionTier | null;
  /** True when content was stripped by content gating */
  proRestricted?: boolean;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  executionCount: number;
  uniqueExecutionCount: number;
  forkCount: number;
  starCount: number;
  authorshipType?: AuthorshipType | null;
  /**
   * Aggregate risk level, denormalized from the version's risk_profile at
   * write time. Absent/null = no profile yet (pending — never clean). Gate on
   * {@link isListVerdictTrustworthy} before rendering: 'none' beside
   * `scanStatus: 'failed'` is a sentinel, not a clean verdict (P6).
   */
  riskLevel?: RiskLevel | null;
  /** Sync scan outcome at the list grain; null/absent on legacy rows (treat as complete when riskLevel is present). */
  scanStatus?: ScanStatus | null;
  /** Deep analysis outcome at the list grain: 'analyzed'/'error' only — deep pending/skipped is represented by null. */
  deepStatus?: DeepAnalysisOutcomeStatus | null;
}

/**
 * List-grain twin of {@link isVerdictTrustworthy}, operating on the flattened
 * scalar triple carried by {@link DefinitionListItem} instead of the full
 * profile. Same P6 discipline: an absent triple is NOT trustworthy (pending,
 * never clean); a failed sync scan or errored deep analysis makes
 * `riskLevel: 'none'` a sentinel, not a verdict. As with the profile
 * predicate, absent statuses beside a present riskLevel are legacy rows and
 * treated as complete. Mirrors the registry frontend's predicate of the same
 * name — centralized here so CLI/MCP list consumers don't re-derive it.
 */
export function isListVerdictTrustworthy(item: {
  riskLevel?: RiskLevel | null;
  scanStatus?: ScanStatus | null;
  deepStatus?: DeepAnalysisOutcomeStatus | null;
}): boolean {
  return item.riskLevel != null
    && item.scanStatus !== 'failed'
    && item.deepStatus !== 'error';
}

/**
 * Query parameters for listing definitions
 */
export interface ListDefinitionsQuery {
  type?: DefinitionType;
  status?: DefinitionStatus;
  agentType?: AgentType;
  domain?: Domain;
  tier?: Tier;
  visibility?: Visibility;
  authorId?: string;
  search?: string;
  tag?: string | string[];
  /** Filter by fork status: true = only forks, false = only originals */
  isFork?: boolean;
  /** Filter by authorship type */
  authorshipType?: AuthorshipType;
  limit?: number;
  offset?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

/**
 * Options for getting a single definition
 */
export interface GetDefinitionOptions {
  includeRuntime?: boolean;
  includeYaml?: boolean;
  includeRefs?: boolean;
  /** Request server-side normalization (authoring→runtime structural transform). */
  normalize?: boolean;
}

/**
 * Request body for creating a new definition
 */
export interface CreateDefinitionBody {
  /** Raw YAML content in UDL format (ADL/CDL/WDL/PDL). Maximum 150KB. */
  yaml: string;
  visibility?: Visibility;
  provenance?: Provenance;
}

/**
 * Request body for updating a draft definition
 */
export interface UpdateDefinitionBody {
  yaml?: string;
  visibility?: Visibility;
  displayName?: string;
  description?: string;
  domain?: Domain;
  subdomain?: string;
  agentType?: AgentType;
  tags?: string[];
  changeSummary?: string;
  changeType?: ChangeType;
  provenance?: Provenance;
  tier?: Tier;
  minSubscription?: SubscriptionTier;
}

/**
 * Request body for deprecating a published definition
 */
export interface DeprecateDefinitionBody {
  reason: string;
  successor?: string;
}

/**
 * Non-fatal warning emitted during a publish operation.
 *
 * Translation and safety scans run as part of publishing but never block — they
 * log server-side and now surface as warnings on the response. Consumers
 * receiving a `TRANSLATION_FAILED` warning should treat the publish as partial:
 * the row is published but `runtimeMd` was not stamped and the definition will
 * not render until the YAML is corrected.
 *
 * @remarks Known codes (more may be added without bumping major):
 * - `TRANSLATION_FAILED` — YAML did not validate against the current schema.
 * - `TRANSLATION_ERROR` — translator threw an unexpected error.
 * - `SAFETY_SCAN_FAILED` — sync safety scan failed; version has no `riskProfile`.
 * - `SAFETY_PROFILE_PERSIST_FAILED` — scan succeeded but persisting it failed.
 * - `DEEP_ANALYSIS_ENQUEUE_FAILED` — background deep-safety queue unavailable.
 */
export interface PublishWarning {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Result of a publish operation.
 *
 * `warnings` is always present, possibly empty. The previous return type
 * (`Definition` directly) is replaced — see CHANGELOG 0.29.0 for migration notes.
 */
export interface PublishResult {
  definition: Definition;
  warnings: PublishWarning[];
}
