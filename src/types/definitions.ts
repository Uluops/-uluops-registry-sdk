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

export interface DeepAnalysisResult {
  version: string;
  analyzedAt: string;
  findings: DeepFinding[];
  riskLevel: RiskLevel;
}

export interface RiskProfile {
  sync: SyncScanResult;
  deep: DeepAnalysisResult | null;
  aggregateRiskLevel: RiskLevel;
  lastUpdated: string;
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
  forkCount: number;
  starCount: number;
  authorshipType?: AuthorshipType | null;
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
