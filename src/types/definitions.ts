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
  Tier,
  Visibility,
} from './enums.js';

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
  yaml?: string | null;
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
  visibility: Visibility;
  runtimeMd?: string | null;
  promptHash?: string | null;
  translatorVersion?: string | null;
  schemaVersion?: string | null;
  executionCount: number;
  forkCount: number;
  starCount: number;
  forkedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  deprecatedAt?: string | null;
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
}

/**
 * Request body for creating a new definition
 */
export interface CreateDefinitionBody {
  yaml: string;
  visibility?: Visibility;
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
}

/**
 * Request body for deprecating a published definition
 */
export interface DeprecateDefinitionBody {
  reason: string;
  successor?: string;
}
