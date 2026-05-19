**[UluOps](https://uluops.ai)** · Operating Intelligence as Infrastructure

---

# @uluops/registry-sdk

[![npm version](https://img.shields.io/npm/v/@uluops/registry-sdk.svg)](https://www.npmjs.com/package/@uluops/registry-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

TypeScript SDK for the UluOps Registry API. Manage AI workflow definitions including agents, commands, workflows, and pipelines.

## Quick Start

> **Note:** Examples use TypeScript syntax. Run with [tsx](https://github.com/privatenumber/tsx) (`npx tsx script.ts`) or compile with `tsc` first. A running Registry API server is required — see [Environment Variables](#environment-variables) to configure the base URL.

```typescript
import { RegistryClient } from '@uluops/registry-sdk';

const client = new RegistryClient({
  apiKey: 'ulr_your-api-key-here',
});

// List agent definitions
const { definitions: agents } = await client.definitions.list({ type: 'agent' });

// Get a specific definition
const def = await client.definitions.get('agent', 'code-validator', '1.0.0');

// Create a new definition
const newDef = await client.definitions.create('agent', 'my-agent', {
  yaml: 'agent:\n  interface:\n    name: my-agent\n    version: 1.0.0',
});
```

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Authentication](#authentication)
- [TypeScript Support](#typescript-support)
- [API Reference](#api-reference)
  - [Definitions](#definitions-clientdefinitions)
  - [Versions](#versions-clientversions)
  - [Validation](#validation-clientvalidation)
  - [Dependencies](#dependencies-clientdependencies)
  - [Forks](#forks-clientforks)
  - [Executions](#executions-clientexecutions)
  - [Stars](#stars-clientstars)
  - [Translation](#translation-clienttranslation)
  - [Models](#models-clientmodels)
  - [Users](#users-clientusers)
  - [Render](#render-clientrender)
  - [Analytics](#analytics-clientanalytics)
- [Environment Variables](#environment-variables)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
  - [Node.js Environment Discovery](#nodejs-environment-discovery)
  - [Browser Usage](#browser-usage)
- [License](#license)

## Features

- **Full API Coverage**: Access all registry endpoints across 12 operation domains
- **Browser Compatible**: Constructor is browser-safe — use in Next.js, React, or any browser bundler
- **Type-Safe**: Complete TypeScript definitions with Zod runtime validation on all API operations
- **Dual Authentication**: API key (preferred) and JWT session support
- **Automatic Retries**: Exponential backoff for transient errors (502, 503, 504, 429)
- **Error Hierarchy**: Typed errors for precise error handling
- **Subpath Exports**: Import only what you need (`@uluops/registry-sdk/types`, `@uluops/registry-sdk/errors`)

## Installation

> **Note:** This package is ESM-only. CJS environments (`require()`) are not supported.
> Ensure your project uses `"type": "module"` or an ESM-compatible bundler.

```bash
# npm
npm install @uluops/registry-sdk

# yarn
yarn add @uluops/registry-sdk

# pnpm
pnpm add @uluops/registry-sdk
```

**Requirements:**
- Node.js 18.0.0 or higher (server-side)
- Any modern browser with `fetch` support (client-side)
- TypeScript 5.0+ (for TypeScript users)

## Authentication

The SDK supports two authentication methods:

### API Key Authentication (Recommended)

API keys provide persistent authentication without session management. Keys must start with the `ulr_` prefix.

```typescript
import { RegistryClient } from '@uluops/registry-sdk';

const client = new RegistryClient({
  apiKey: 'ulr_your-api-key-here',
});

// Check authentication status
console.log(client.isAuthenticated()); // true
console.log(client.getAuthType()); // 'api_key'
```

### Session-Based Authentication

For interactive applications, use `login()` to obtain a session token programmatically:

```typescript
// Login with email/password — no API key required
// Note: process.env is Node.js-only. In browser environments,
// pass the URL string directly instead.
const client = new RegistryClient({
  authBaseUrl: process.env.ULUOPS_AUTH_URL, // ops API for login
});
const { sessionToken, expiresAt } = await client.login('user@example.com', 'password');
// The client is now authenticated — subsequent requests use the session token

// Or pass an existing token directly
const client2 = new RegistryClient({
  sessionToken: 'your-jwt-token',
});

// Clear the session when done
client.logout();
```

The auth URL defaults to production (`https://api.uluops.ai/api/v1/ops`). For local development, set `ULUOPS_AUTH_URL` in your `.env` file or pass `authBaseUrl` to the constructor.

### Validating Credentials

Use the config utilities to check credentials before constructing a client:

```typescript
import { isApiKey, validateCredentials, API_KEY_PREFIX } from '@uluops/registry-sdk/config';

const key = process.env.ULUOPS_API_KEY;

// Check that credentials are present (throws ValidationError if missing)
try {
  validateCredentials({ apiKey: key });
} catch (error) {
  console.error('No credentials found:', error.message);
  process.exit(1);
}

// Validate API key prefix format (returns boolean)
if (!isApiKey(key!)) {
  console.error(`Invalid API key format. Keys must start with '${API_KEY_PREFIX}'`);
  process.exit(1);
}
```

### Credential Priority Chain

When using `createClientFromEnvironment()` (see [Node.js Environment Discovery](#nodejs-environment-discovery)), credentials are loaded in the following order:

1. **Explicit arguments**: `apiKey`, `sessionToken` passed to the function
2. **Environment variables**: `ULUOPS_API_KEY`, `ULUOPS_SESSION_TOKEN`
3. **Local `.env` file**: In the current working directory
4. **Global credentials**: `~/.uluops/credentials.json`

> **Note:** The `new RegistryClient()` constructor uses only the config you pass directly. It does not read environment variables or credential files — this keeps it browser-safe. Use `createClientFromEnvironment()` for automatic credential discovery in Node.js.

## TypeScript Support

The SDK is written in TypeScript with full type definitions. Import types directly:

```typescript
// Main client
import { RegistryClient, type RegistryClientConfig } from '@uluops/registry-sdk';

// Types only
import type {
  Definition,
  DefinitionType,
  DefinitionStatus,
  ValidationFieldError,
  Model,
  PublicUser,
} from '@uluops/registry-sdk';

// Errors only
import {
  RegistryApiError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from '@uluops/registry-sdk/errors';

// Config utilities
import { loadCredentials, DEFAULT_BASE_URL } from '@uluops/registry-sdk/config';
```

### Package Exports

| Export Path | Contents | Browser Safe |
|------------|----------|:---:|
| `@uluops/registry-sdk` | Main `RegistryClient`, `RegistryHttpClient`, auth strategies | Yes |
| `@uluops/registry-sdk/types` | TypeScript types (PascalCase), Zod runtime schemas (`*Schema` suffix), enum arrays (SCREAMING_SNAKE) | Yes |
| `@uluops/registry-sdk/errors` | Error classes and utilities | Yes |
| `@uluops/registry-sdk/config` | Configuration loaders, `createClientFromEnvironment`, constants | No (Node.js) |

## API Compatibility

This SDK targets the **UluOps Registry API v1** (`/api/v1`). The SDK version follows [semver](https://semver.org/):

- **Patch** (0.1.x): Bug fixes, no API changes
- **Minor** (0.x.0): New features, backward-compatible
- **Major** (x.0.0): Breaking changes (method signatures, removed endpoints)

The base URL defaults to `https://api.uluops.ai/api/v1/registry` in production and `http://localhost:3001/api/v1` when `NODE_ENV=development`. Override with the `baseUrl` constructor option or `ULUOPS_REGISTRY_URL` env var.

## API Reference

### Client Configuration

```typescript
const client = new RegistryClient({
  // Authentication (choose one)
  apiKey: 'ulr_your-api-key-here', // API key (preferred)
  sessionToken: 'jwt-token',   // Existing session token
  email: 'user@example.com',   // Email for session auth (requires password)
  password: 'secret',          // Password for session auth (requires email)

  // Connection settings
  timeout: 30000,              // Request timeout in ms (default: 30000)
  retries: 3,                  // Retry count for transient errors (default: 3)
  orgSlug: 'my-org',           // Organization slug for multi-tenancy
  debug: false,                // Enable debug logging

  // Callbacks
  onTokenRefresh: (token) => { /* handle token refresh */ },
});
```

### Client Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isAuthenticated()` | `boolean` | Check if credentials are configured and valid |
| `getAuthType()` | `'api_key' \| 'session' \| null` | Get the authentication strategy in use |
| `login(email, password)` | `Promise<LoginResult>` | Login with email/password via the ops API |
| `logout()` | `void` | Clear the local session token (no server-side revocation) |
| `getHttpClient()` | `RegistryHttpClient` | Access the underlying HTTP client for custom requests |

---

### Definitions (`client.definitions`)

Manage AI workflow definitions (agents, commands, workflows, pipelines).

#### `list(query?)`

List definitions with optional filters.

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `DefinitionType` | Filter by type ('agent', 'command', 'workflow', 'pipeline') |
| `status` | `DefinitionStatus` | Filter by status ('draft', 'published', 'deprecated', 'archived') |
| `domain` | `Domain` | Filter by domain |
| `authorId` | `string` | Filter by author user ID |
| `visibility` | `Visibility` | Filter by visibility |
| `search` | `string` | Text search across name and description |
| `tag` | `string \| string[]` | Filter by tag(s) |
| `isFork` | `boolean` | `true` = only forks, `false` = only originals |
| `authorshipType` | `AuthorshipType` | Filter by authorship ('human', 'agent', 'collaborative', 'automated') |
| `agentType` | `AgentType` | Filter by agent type |
| `tier` | `Tier` | Filter by subscription tier |
| `sortBy` | `SortField` | Sort field ('name', 'createdAt', 'executionCount', etc.) |
| `sortOrder` | `SortOrder` | 'asc' or 'desc' |
| `limit` | `number` | Max results (default: 50, max: 200) |
| `offset` | `number` | Pagination offset |

```typescript
const agents = await client.definitions.list({
  type: 'agent',
  status: 'published',
  limit: 20,
});
```

#### `get(type, name, version?, options?)`

Get a definition by type, name, and optional version.

| Option | Type | Description |
|--------|------|-------------|
| `includeYaml` | `boolean` | Include raw YAML content in response |
| `includeRuntime` | `boolean` | Include rendered markdown in response |
| `includeRefs` | `boolean` | Include dependency references |

```typescript
// Get latest version
const def = await client.definitions.get('agent', 'code-validator');

// Get specific version
const def = await client.definitions.get('agent', 'code-validator', '1.0.0');

// Include YAML and rendered markdown
const full = await client.definitions.get('agent', 'code-validator', '1.0.0', {
  includeYaml: true,
  includeRuntime: true,
});
```

#### `create(type, name, body)`

Create a new draft definition.

```typescript
const def = await client.definitions.create('agent', 'my-agent', {
  yaml: `
agent:
  interface:
    name: my-agent
    version: 1.0.0
    description: My custom agent
  `,
  visibility: 'public',
});
```

#### `update(type, name, version, body)`

Update an existing draft definition.

```typescript
const def = await client.definitions.update('agent', 'my-agent', '1.0.0', {
  yaml: updatedYaml,
});
```

#### `delete(type, name, version)`

Delete a draft definition. Published definitions cannot be deleted.

```typescript
await client.definitions.delete('agent', 'my-agent', '1.0.0');
```

#### `publish(type, name, version)`

Publish a draft definition to make it available.

```typescript
const def = await client.definitions.publish('agent', 'my-agent', '1.0.0');
console.log(def.status); // 'published'
```

#### `deprecate(type, name, version, body)`

Deprecate a published definition.

```typescript
const def = await client.definitions.deprecate('agent', 'my-agent', '1.0.0', {
  reason: 'Replaced by my-agent-v2',
  successor: 'my-agent-v2@1.0.0',
});
```

#### `archive(type, name, version)`

Archive a deprecated definition. This is a terminal state that removes the definition from discovery.

```typescript
await client.definitions.archive('agent', 'my-agent', '1.0.0');
```

---

### Versions (`client.versions`)

Manage definition version history.

#### `list(type, name, options?)`

List all versions of a definition.

```typescript
const { versions } = await client.versions.list('agent', 'code-validator', {
  limit: 20,
  offset: 0,
});
for (const v of versions) {
  console.log(`${v.version}: ${v.status}`);
}
```

#### `diff(type, name, fromVersion, toVersion, options?)`

Compare two versions showing changes. The response shape depends on the `format` option:

```typescript
// Section-level summary (default)
const summary = await client.versions.diff('agent', 'code-validator', '1.0.0', '2.0.0');
console.log(summary.sectionsAdded, summary.sectionsRemoved, summary.sectionsModified);

// Unified text diff
const unified = await client.versions.diff('agent', 'code-validator', '1.0.0', '2.0.0', {
  format: 'unified',
});
console.log(unified.unified); // string containing unified diff

// Field-level diff with suggested semver bump
const fields = await client.versions.diff('agent', 'code-validator', '1.0.0', '2.0.0', {
  format: 'fields',
});
console.log(fields.suggestedBump); // 'major' | 'minor' | 'patch'

// Full raw YAML
const full = await client.versions.diff('agent', 'code-validator', '1.0.0', '2.0.0', {
  full: true,
});
console.log(full.fromYaml, full.toYaml);
```

---

### Validation (`client.validation`)

Validate definition YAML before creating.

#### `validate(type, yaml)`

Validate YAML against the schema.

```typescript
const result = await client.validation.validate('agent', yamlContent);
if (result.valid) {
  console.log('YAML is valid');
} else {
  console.log('Errors:', result.errors);
}
```

---

### Dependencies (`client.dependencies`)

Query dependency relationships between definitions.

#### `get(type, name, version, options?)`

Get the dependency graph for a definition.

```typescript
const graph = await client.dependencies.get('workflow', 'my-workflow', '1.0.0', {
  maxDepth: 3,
});
console.log('Nodes:', graph.nodes);
console.log('Edges:', graph.edges);
console.log('Cycles detected:', graph.cycleDetected);
```

#### `getDependents(type, name, version)`

Get definitions that depend on this one.

```typescript
const dependents = await client.dependencies.getDependents('agent', 'code-validator', '1.0.0');
```

---

### Forks (`client.forks`)

Fork definitions to create derivatives.

#### `create(type, name, version, body)`

Fork a definition to a new name.

```typescript
const forked = await client.forks.create('agent', 'code-validator', '1.0.0', {
  name: 'my-code-validator',
});
```

#### `isForkable(type, name, version)`

Check if a definition can be forked.

```typescript
const check = await client.forks.isForkable('agent', 'code-validator', '1.0.0');
if (check.canFork) {
  console.log('Can fork!');
}
```

#### `getAncestry(type, name, version)`

Get the fork ancestry chain.

```typescript
const lineage = await client.forks.getAncestry('agent', 'my-validator', '1.0.0');
console.log('Source:', lineage.source);
console.log('Chain:', lineage.chain);
```

#### `list(type, name, version)`

List all forks of a definition.

```typescript
const result = await client.forks.list('agent', 'code-validator', '1.0.0');
console.log(result.totalForks); // 2
result.forks.forEach(({ fork, definition }) => {
  console.log(definition?.name, fork.forkedAt);
});
```

---

### Executions (`client.executions`)

Record and query execution statistics.

#### `record(type, name, version, body)`

Record an execution event.

```typescript
const result = await client.executions.record('agent', 'code-validator', '1.0.0', {
  source: 'cli',
  runId: '550e8400-e29b-41d4-a716-446655440000', // optional, for idempotency
});
console.log(result.recorded); // true if new, false if duplicate
```

#### `getStats(type, name, version, window?)`

Get aggregated execution statistics.

```typescript
const stats = await client.executions.getStats('agent', 'code-validator', '1.0.0', 60);
console.log(`Total executions: ${stats.totalCount}`);
console.log(`Recent executions: ${stats.recentCount}`);
console.log(`Window: ${stats.windowMinutes} minutes`);
```

---

### Stars (`client.stars`)

Star and unstar definitions. Stars are tracked per-user per-definition (not per-version). All operations are idempotent and require authentication.

#### `getStatus(type, name, version?)`

Check if the authenticated user has starred a definition.

```typescript
const status = await client.stars.getStatus('agent', 'code-validator');
console.log(status.starred); // true
console.log(status.starCount); // 42
```

#### `star(type, name, version?)`

Star a definition. No-op if already starred.

```typescript
const result = await client.stars.star('agent', 'code-validator');
console.log(result.starCount); // 43
```

#### `unstar(type, name, version?)`

Unstar a definition. No-op if not starred.

```typescript
const result = await client.stars.unstar('agent', 'code-validator');
console.log(result.starCount); // 42
```

---

### Translation (`client.translation`)

Manage definition translation between schema versions.

#### `getVersion()`

Get the current translator version.

```typescript
const version = await client.translation.getVersion();
console.log(`Translator: ${version.translatorVersion}`);
```

#### `retranslate(type, name, version, options?)`

Re-translate a definition with the latest translator.

```typescript
const def = await client.translation.retranslate('agent', 'my-agent', '1.0.0', {
  createNewVersion: true,
});
```

#### `upgradeDefinition(type, name, body)`

Upgrade a legacy definition to the current format.

```typescript
const result = await client.translation.upgradeDefinition('agent', 'legacy-agent', {
  yaml: oldFormatYaml,
});
```

---

### Models (`client.models`)

Query the AI model catalog.

#### `list(query?)`

List available AI models.

```typescript
const result = await client.models.list({
  provider: 'anthropic',
  tier: 'premium',
});
for (const model of result.models) {
  console.log(`${model.provider}/${model.modelId}: ${model.displayName}`);
}
```

#### `get(provider, modelId)`

Get details for a specific model.

```typescript
const model = await client.models.get('anthropic', 'claude-3-opus');
console.log(model.capabilities);
```

#### `listProviders()`

List all model providers.

```typescript
const providers = await client.models.listProviders();
```

#### `listAliases()`

List model aliases (e.g., 'latest', 'opus').

```typescript
const aliases = await client.models.listAliases();
```

#### `resolveAlias(alias)`

Resolve an alias to a concrete model.

```typescript
const resolution = await client.models.resolveAlias('opus');
console.log(`${resolution.alias} → ${resolution.target}`);
```

#### `sync()`

Sync model catalog from models.dev (admin only).

```typescript
const result = await client.models.sync();
console.log(`Synced: ${result.modelsAdded} added, ${result.modelsUpdated} updated`);
```

---

### Users (`client.users`)

Query public user profiles.

#### `get(id)`

Get a public user profile by ID.

```typescript
const user = await client.users.get('user-uuid');
console.log(user.username, user.name);
```

#### `batch(ids)`

Batch lookup multiple users (max 100).

```typescript
const users = await client.users.batch(['id1', 'id2', 'id3']);
console.log(users['id1']?.username);
// Unknown IDs return null — the key is present but the value is null
console.log(users['nonexistent-id']); // null
```

---

### Render (`client.render`)

Get rendered definition output.

#### `get(type, name, version, options?)`

Get the fully rendered/resolved definition. Pass `"latest"` as the version to resolve to the most recent published version.

```typescript
// Get latest published version
const rendered = await client.render.get('agent', 'code-validator', 'latest');
console.log(rendered.markdown);

// Get specific version
const specific = await client.render.get('agent', 'code-validator', '1.5.0');

// With render profile (optional: 'core' or 'uluops-full')
const full = await client.render.get('agent', 'code-validator', 'latest', {
  renderProfile: 'uluops-full',
});

// Multi-target render (for OpenCode, Codex, Gemini adapters)
const adapted = await client.render.get('agent', 'code-validator', 'latest', {
  target: 'opencode',    // Target harness format
  model: 'gpt-5.3',      // Model override for target envelope
});
```

#### `preview(type, body)`

Preview render without saving.

```typescript
const preview = await client.render.preview('agent', {
  yaml: rawYaml,
});
```

### Analytics (`client.analytics`)

Definition effectiveness, health grades, lineage, evolution, and cross-version comparison. Health scores are **provisional** pending a 90-day calibration study.

#### `getEffectiveness(type, name, version?)`

Get effectiveness metrics: pass rate, scores, taxonomy distribution, health score, and composition lift.

```typescript
const eff = await client.analytics.getEffectiveness('agent', 'code-validator');
console.log(eff.metrics.healthScore); // 67
console.log(eff.metrics.effectiveness?.passRate); // 49.4

// Specific version
const v2 = await client.analytics.getEffectiveness('agent', 'code-validator', '2.0.0');
```

#### `getHealth(type, name, version?)`

Get health grade (A-F) and issue profile with failure domain distribution.

```typescript
const health = await client.analytics.getHealth('agent', 'code-validator');
console.log(health.grade); // 'B'
console.log(health.provisional); // true — weights unvalidated
console.log(health.caveats); // ['PROVISIONAL: ...']
```

#### `getEcosystemOverview()`

Get ecosystem-wide overview: definition counts, aggregate health, top performers, needs-attention list.

```typescript
const overview = await client.analytics.getEcosystemOverview();
console.log(overview.definitions.total); // 42
console.log(overview.effectiveness.topPerformers);
```

#### `getLineage(type, name)`

Get the lineage graph: versions and forks as a tree with per-node health scores.

```typescript
const lineage = await client.analytics.getLineage('agent', 'code-validator');
console.log(lineage.totalVersions); // 3
console.log(lineage.totalForks); // 1
```

#### `getEvolution(type, name)`

Get version-over-version metrics timeline with trend detection.

```typescript
const evo = await client.analytics.getEvolution('agent', 'code-validator');
console.log(evo.trend); // 'improving'
console.log(evo.trendConfidence); // 'high'
```

#### `getTranslation(type, name)`

Get versions grouped by translator version with aggregate metrics.

```typescript
const translation = await client.analytics.getTranslation('agent', 'code-validator');
for (const group of translation.groups) {
  console.log(`${group.translatorVersion}: ${group.aggregateMetrics.avgPassRate}%`);
}
```

#### `compare(type, name, versions)`

Compare effectiveness across 2-5 definition versions side-by-side.

```typescript
const cmp = await client.analytics.compare('agent', 'code-validator', ['1.0.0', '1.1.0', '1.2.0']);
for (const v of cmp.versions) {
  console.log(`${v.version}: pass=${v.passRate}%, health=${v.healthScore}`);
}
```

#### `getDiffImpact(type, name, fromVersion, toVersion)`

Get structural diff combined with metric deltas between two versions. Deltas are observational, not causal.

```typescript
const impact = await client.analytics.getDiffImpact('agent', 'code-validator', '1.0.0', '1.1.0');
console.log(impact.deltas.passRateDelta); // 15
console.log(impact.caveats); // ['OBSERVATIONAL: ...']
```

---

## Environment Variables

These variables are read by `createClientFromEnvironment()` and `loadConfig()` from the `/config` sub-path. The `new RegistryClient()` constructor does **not** read environment variables — pass config explicitly instead.

| Variable | Description | Default |
|----------|-------------|---------|
| `ULUOPS_API_KEY` | API key for authentication | - |
| `ULUOPS_SESSION_TOKEN` | JWT session token | - |
| `ULUOPS_EMAIL` | Email for session-based auth | - |
| `ULUOPS_PASSWORD` | Password for session-based auth | - |
| `ULUOPS_REGISTRY_URL` | Registry API base URL | `https://api.uluops.ai/api/v1/registry` |
| `ULUOPS_AUTH_URL` | Auth API base URL (for `login()`) | `https://api.uluops.ai/api/v1/ops` |
| `ULUOPS_ORG_SLUG` | Organization slug for multi-tenancy | - |
| `ULUOPS_DEBUG` | Enable debug logging | `false` |

Create a `.env` file in your project:

```env
ULUOPS_API_KEY=ulr_your-api-key-here

# Override for local development:
# ULUOPS_REGISTRY_URL=http://localhost:3001/api/v1
# ULUOPS_AUTH_URL=http://localhost:3100/api/v1
```

## Constants

The `/config` sub-path exports constants for pre-flight checks, debugging, and defensive programming:

```typescript
import {
  MAX_YAML_SIZE,
  SDK_VERSION,
  USER_AGENT,
  HTTP_STATUS,
  ERROR_CODES,
  RETRYABLE_STATUS_CODES,
  ENV_VARS,
  CONFIG_PATHS,
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY_COUNT,
  API_KEY_PREFIX,
} from '@uluops/registry-sdk/config';

// Validate payload size before uploading
if (yamlBuffer.byteLength > MAX_YAML_SIZE) {
  throw new Error(`YAML exceeds ${MAX_YAML_SIZE} bytes`);
}

// Log the SDK version for debugging
console.log('SDK version:', SDK_VERSION);

// Check error codes programmatically
if (error.code === ERROR_CODES.NOT_FOUND) { /* ... */ }
```

The sub-path also exports Node.js-only helpers for credential discovery:

```typescript
import {
  createClientFromEnvironment,
  loadCredentials,
  loadConfig,
  loadStoredCredentials,
  loadEnvFiles,
  getGlobalConfigDir,
  getCredentialsPath,
  isApiKey,
  validateCredentials,
} from '@uluops/registry-sdk/config';
```

## Error Handling

The SDK provides a typed error hierarchy so you can catch and recover from specific failure modes.

### Error Classes

| Error | Status | When It Happens |
|-------|--------|-----------------|
| `ValidationError` | 400 | Malformed request — invalid params, missing fields |
| `UnauthorizedError` | 401 | No credentials, expired token, invalid API key |
| `ForbiddenError` | 403 | Valid credentials but insufficient permissions or subscription tier |
| `NotFoundError` | 404 | Definition, model, or user doesn't exist |
| `ConflictError` | 409 | Name collision, publishing already-published definition |
| `PayloadTooLargeError` | 413 | YAML exceeds 150KB limit |
| `UnprocessableError` | 422 | Valid YAML syntax but invalid semantics (missing refs, cycles) |
| `RateLimitError` | 429 | Too many requests (100 executions/min per definition) |
| `ServiceUnavailableError` | 503 | Server temporarily down or overloaded |
| `NetworkError` | - | DNS failure, connection refused, network unreachable |
| `TimeoutError` | - | Request exceeded timeout (default: 30s) |
| `ResponseValidationError` | * | API response did not match expected Zod schema (from `@uluops/registry-sdk/errors`) |

All API errors extend `RegistryApiError` and include:
- `statusCode` — HTTP status code (0 for network/timeout)
- `code` — Machine-readable error code (e.g., `'NOT_FOUND'`, `'RATE_LIMIT_ERROR'`)
- `message` — Human-readable description
- `details` — Optional structured metadata
- `requestId` — Server request ID for support/debugging

### Basic Error Handling

```typescript
import {
  RegistryApiError,
  NotFoundError,
  ValidationError,
  isRegistryApiError,
} from '@uluops/registry-sdk/errors';

try {
  const def = await client.definitions.get('agent', 'my-agent', '1.0.0');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Definition not found');
  } else if (error instanceof ValidationError) {
    console.log('Bad request:', error.details);
  } else if (isRegistryApiError(error)) {
    console.log(`API error [${error.code}]: ${error.message}`);
  } else {
    throw error; // Unexpected non-API error
  }
}
```

### Recovery Patterns

#### Handling Authentication Failures

```typescript
import { UnauthorizedError, ForbiddenError } from '@uluops/registry-sdk/errors';

try {
  await client.definitions.create('agent', 'my-agent', { yaml });
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // Token expired or invalid — re-authenticate
    const newToken = await refreshMyToken();
    const retryClient = new RegistryClient({ sessionToken: newToken });
    await retryClient.definitions.create('agent', 'my-agent', { yaml });
  } else if (error instanceof ForbiddenError) {
    // Valid auth but wrong role/tier — can't retry, need elevated permissions
    console.error('Requires publisher role or pro subscription');
  }
}
```

#### Rate Limit Backoff

The SDK auto-retries on 429 with exponential backoff, but if all retries are exhausted:

```typescript
import { RateLimitError } from '@uluops/registry-sdk/errors';

try {
  await client.executions.record('agent', 'my-agent', '1.0.0', { source: 'cli' });
} catch (error) {
  if (error instanceof RateLimitError) {
    const waitMs = (error.retryAfter ?? 60) * 1000;
    console.log(`Rate limited. Waiting ${waitMs / 1000}s...`);
    await new Promise((r) => setTimeout(r, waitMs));
    await client.executions.record('agent', 'my-agent', '1.0.0', { source: 'cli' });
  }
}
```

#### Handling YAML Validation Errors

Two distinct failure modes for YAML — catch them separately:

```typescript
import { ValidationError, UnprocessableError, PayloadTooLargeError } from '@uluops/registry-sdk/errors';

try {
  await client.definitions.create('agent', 'my-agent', { yaml: rawYaml });
} catch (error) {
  if (error instanceof PayloadTooLargeError) {
    // YAML > 150KB — split or compress before retrying
    console.error('YAML too large. Max: 150KB');
  } else if (error instanceof ValidationError) {
    // Malformed request (e.g., missing required fields in body)
    console.error('Request validation failed:', error.details);
  } else if (error instanceof UnprocessableError) {
    // YAML parses but is semantically invalid (bad refs, missing interface, cycles)
    console.error('YAML semantic errors:', error.details);
  }
}
```

#### Conflict Resolution

Conflicts arise from name collisions or state transitions:

```typescript
import { ConflictError } from '@uluops/registry-sdk/errors';

try {
  await client.definitions.create('agent', 'my-agent', { yaml });
} catch (error) {
  if (error instanceof ConflictError) {
    // Name already taken — try updating instead, or choose a different name
    console.log('Definition already exists, updating...');
    await client.definitions.update('agent', 'my-agent', '1.0.0', { yaml });
  }
}
```

#### Network Resilience

For unreliable networks, combine timeout config with manual retry:

```typescript
import { NetworkError, TimeoutError, ServiceUnavailableError } from '@uluops/registry-sdk/errors';

async function resilientFetch() {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.definitions.list({ type: 'agent', limit: 10 });
    } catch (error) {
      const isTransient =
        error instanceof NetworkError ||
        error instanceof TimeoutError ||
        error instanceof ServiceUnavailableError;

      if (isTransient && attempt < maxAttempts) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
}
```

#### Logging All Errors with Request ID

For production debugging, log the `requestId` so support can trace the request server-side:

```typescript
import { isRegistryApiError } from '@uluops/registry-sdk/errors';

try {
  await client.definitions.publish('agent', 'my-agent', '1.0.0');
} catch (error) {
  if (isRegistryApiError(error)) {
    console.error(JSON.stringify({
      level: 'error',
      code: error.code,
      status: error.statusCode,
      message: error.message,
      requestId: error.requestId,
      details: error.details,
    }));
  }
}
```

### Automatic Retries

The SDK automatically retries GET requests on transient errors (502, 503, 504, 429) with exponential backoff and jitter. Mutations (POST/PUT/DELETE) are **not** retried by default to prevent duplicate side effects.

```typescript
const client = new RegistryClient({
  apiKey: 'ulr_your-api-key-here',
  retries: 3,        // Max retry attempts (default: 3)
  timeout: 30000,    // Request timeout in ms (default: 30000)
});
```

Retryable status codes: `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`, `429 Too Many Requests`.

## Advanced Usage

### Auth Strategies

The SDK exports `ApiKeyAuth`, `JwtSessionAuth`, and `createAuthStrategy` for advanced composition. Most users should use `RegistryClient` directly — these are for cases where you need to manage auth independently of the client (e.g., sharing a token across multiple SDK instances or implementing custom refresh logic).

```typescript
import { ApiKeyAuth, JwtSessionAuth, createAuthStrategy } from '@uluops/registry-sdk';

// Auto-detect from config
const auth = createAuthStrategy({ apiKey: 'ulr_your-api-key-here' });

// Or construct directly
const apiAuth = new ApiKeyAuth('ulr_your-api-key-here');
```

### Using the Low-Level HTTP Client

Access the HTTP client from an existing `RegistryClient` via `getHttpClient()`, or construct one directly:

```typescript
// From an existing client (preserves auth config)
const http = client.getHttpClient();
const data = await http.get<MyType>('/custom/endpoint');

// Or construct directly
import { RegistryHttpClient } from '@uluops/registry-sdk';

const http = new RegistryHttpClient({
  baseUrl: 'https://api.uluops.ai/api/v1/registry',
  apiKey: 'ulr_your-api-key-here',
});

// Make raw requests
const data = await http.get<MyType>('/custom/endpoint', { param: 'value' });
const result = await http.post<MyType>('/custom/endpoint', { body: 'data' });
```

### Node.js Environment Discovery

Use `createClientFromEnvironment()` to auto-discover credentials from environment variables, `.env` files, and `~/.uluops/credentials.json`:

```typescript
import { createClientFromEnvironment } from '@uluops/registry-sdk/config';

// Auto-discover all config from environment
const client = createClientFromEnvironment();

// Auto-discover with overrides
const clientWithOverrides = createClientFromEnvironment({
  debug: true,
  baseUrl: 'http://localhost:3001/api/v1',
});
```

You can also load config manually:

```typescript
import { loadCredentials, loadConfig } from '@uluops/registry-sdk/config';

// Load from environment and config files
const credentials = loadCredentials();
console.log(credentials.apiKey);

// Load full config
const config = loadConfig();
console.log(config.baseUrl);
```

> **Note:** The `/config` sub-path uses Node.js built-ins (`node:fs`, `node:path`, `node:os`) and cannot be imported in browser environments.

### Browser Usage

The main SDK entry point (`@uluops/registry-sdk`) is browser-safe. The `RegistryClient` constructor and all operation methods use `fetch` internally — no Node.js built-ins are required.

```typescript
// Works in Next.js, React, Vite, or any browser bundler
import { RegistryClient } from '@uluops/registry-sdk';

const client = new RegistryClient({
  baseUrl: '/api/v1', // Or your proxy URL
});

const models = await client.models.list({ provider: 'anthropic' });
```

**Type-only imports** are also browser-safe:

```typescript
import type { Model, ModelAlias, Provider } from '@uluops/registry-sdk/types';
```

**Do not import** `@uluops/registry-sdk/config` in browser code — it uses `node:fs` for reading credential files and `.env` loading.

> **CORS:** The Registry API may not set permissive `Access-Control-Allow-Origin` headers. In browser apps, proxy API requests through your own backend (e.g., Next.js API routes) to avoid CORS issues.

## License

MIT License - see [LICENSE](./LICENSE) for details.
