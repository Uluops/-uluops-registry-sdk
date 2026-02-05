# @uluops/registry-sdk

[![npm version](https://img.shields.io/npm/v/@uluops/registry-sdk.svg)](https://www.npmjs.com/package/@uluops/registry-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

TypeScript SDK for the UluOps Registry API. Manage AI workflow definitions including agents, commands, workflows, and pipelines.

## Quick Start

```typescript
import { RegistryClient } from '@uluops/registry-sdk';

const client = new RegistryClient({
  apiKey: 'ulr_your-api-key-here',
});

// List agent definitions
const agents = await client.definitions.list({ type: 'agent' });

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
  - [Translation](#translation-clienttranslation)
  - [Models](#models-clientmodels)
  - [Users](#users-clientusers)
  - [Render](#render-clientrender)
- [Environment Variables](#environment-variables)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
- [License](#license)

## Features

- **Full API Coverage**: Access all registry endpoints across 10 operation domains
- **Type-Safe**: Complete TypeScript definitions with Zod runtime validation
- **Dual Authentication**: API key (preferred) and JWT session support
- **Automatic Retries**: Exponential backoff for transient errors (502, 503, 504, 429)
- **Error Hierarchy**: Typed errors for precise error handling
- **Subpath Exports**: Import only what you need (`@uluops/registry-sdk/types`, `@uluops/registry-sdk/errors`)

## Installation

```bash
# npm
npm install @uluops/registry-sdk

# yarn
yarn add @uluops/registry-sdk

# pnpm
pnpm add @uluops/registry-sdk
```

**Requirements:**
- Node.js 18.0.0 or higher
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

For interactive applications, you can use JWT session tokens:

```typescript
const client = new RegistryClient({
  sessionToken: 'your-jwt-token',
});
```

### Credential Priority Chain

The SDK loads credentials in the following order:

1. **Constructor arguments**: `apiKey`, `sessionToken`
2. **Environment variables**: `ULUOPS_API_KEY`, `ULUOPS_SESSION_TOKEN`
3. **Local `.env` file**: In the current working directory
4. **Global credentials**: `~/.uluops/credentials.json`

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

| Export Path | Contents |
|------------|----------|
| `@uluops/registry-sdk` | Main `RegistryClient`, `RegistryHttpClient`, auth strategies |
| `@uluops/registry-sdk/types` | All TypeScript types and Zod schemas |
| `@uluops/registry-sdk/errors` | Error classes and utilities |
| `@uluops/registry-sdk/config` | Configuration loaders and constants |

## API Reference

### Client Configuration

```typescript
const client = new RegistryClient({
  // Authentication (choose one)
  apiKey: 'ulr_...',           // API key (preferred)
  sessionToken: 'jwt-token',   // Existing session token

  // Connection settings
  baseUrl: 'https://registry.uluops.ai/api/v1',  // API base URL
  timeout: 30000,              // Request timeout in ms (default: 30000)
  retries: 3,                  // Retry count for transient errors (default: 3)
  debug: false,                // Enable debug logging

  // Callbacks
  onTokenRefresh: (token) => { /* handle token refresh */ },
});
```

---

### Definitions (`client.definitions`)

Manage AI workflow definitions (agents, commands, workflows, pipelines).

#### `list(query?)`

List definitions with optional filters.

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `DefinitionType` | Filter by type ('agent', 'command', 'workflow', 'pipeline') |
| `status` | `DefinitionStatus` | Filter by status ('draft', 'published', 'deprecated') |
| `domain` | `Domain` | Filter by domain |
| `ownerId` | `string` | Filter by owner |
| `visibility` | `Visibility` | Filter by visibility |
| `limit` | `number` | Max results (default: 50, max: 200) |
| `offset` | `number` | Pagination offset |

```typescript
const agents = await client.definitions.list({
  type: 'agent',
  status: 'published',
  limit: 20,
});
```

#### `get(type, name, version?)`

Get a definition by type, name, and optional version.

```typescript
// Get latest version
const def = await client.definitions.get('agent', 'code-validator');

// Get specific version
const def = await client.definitions.get('agent', 'code-validator', '1.0.0');
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

---

### Versions (`client.versions`)

Manage definition version history.

#### `list(type, name)`

List all versions of a definition.

```typescript
const versions = await client.versions.list('agent', 'code-validator');
for (const v of versions) {
  console.log(`${v.version}: ${v.status}`);
}
```

#### `diff(type, name, fromVersion, toVersion)`

Compare two versions showing changes.

```typescript
const diff = await client.versions.diff('agent', 'code-validator', '1.0.0', '2.0.0');
console.log(diff.added, diff.removed, diff.modified);
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
  newName: 'my-code-validator',
});
```

#### `checkForkable(type, name, version)`

Check if a definition can be forked.

```typescript
const check = await client.forks.checkForkable('agent', 'code-validator', '1.0.0');
if (check.forkable) {
  console.log('Can fork!');
}
```

#### `getLineage(type, name, version)`

Get the fork ancestry chain.

```typescript
const lineage = await client.forks.getLineage('agent', 'my-validator', '1.0.0');
console.log('Parent:', lineage.parent);
console.log('Ancestors:', lineage.ancestors);
```

#### `list(type, name, version)`

List all forks of a definition.

```typescript
const forks = await client.forks.list('agent', 'code-validator', '1.0.0');
```

---

### Executions (`client.executions`)

Record and query execution statistics.

#### `record(type, name, version, body)`

Record an execution event.

```typescript
await client.executions.record('agent', 'code-validator', '1.0.0', {
  durationMs: 1500,
  status: 'success',
  tokens: { input: 1000, output: 500 },
});
```

#### `getStats(type, name, version, window?)`

Get aggregated execution statistics.

```typescript
const stats = await client.executions.getStats('agent', 'code-validator', '1.0.0', '7d');
console.log(`Executions: ${stats.count}`);
console.log(`Avg duration: ${stats.avgDurationMs}ms`);
console.log(`Success rate: ${stats.successRate * 100}%`);
```

---

### Translation (`client.translation`)

Manage definition translation between schema versions.

#### `getVersion()`

Get the current translator version.

```typescript
const version = await client.translation.getVersion();
console.log(`Translator: ${version.version}`);
```

#### `retranslate(type, name, version, options?)`

Re-translate a definition with the latest translator.

```typescript
const def = await client.translation.retranslate('agent', 'my-agent', '1.0.0', {
  force: true,
});
```

#### `upgrade(type, name, body)`

Upgrade a legacy definition to the current format.

```typescript
const result = await client.translation.upgrade('agent', 'legacy-agent', {
  legacyYaml: oldFormatYaml,
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
console.log(`${resolution.provider}/${resolution.modelId}`);
```

#### `sync()`

Sync model catalog from models.dev (admin only).

```typescript
const result = await client.models.sync();
console.log(`Synced: ${result.added} added, ${result.updated} updated`);
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
```

---

### Render (`client.render`)

Get rendered definition output.

#### `get(type, name, version)`

Get the fully rendered/resolved definition.

```typescript
const rendered = await client.render.get('agent', 'code-validator', '1.0.0');
console.log(rendered.markdown);
```

#### `preview(type, body)`

Preview render without saving.

```typescript
const preview = await client.render.preview('agent', {
  yaml: rawYaml,
});
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ULUOPS_API_KEY` | API key for authentication | - |
| `ULUOPS_SESSION_TOKEN` | JWT session token | - |
| `ULUOPS_REGISTRY_URL` | API base URL | `https://registry.uluops.ai/api/v1` |
| `ULUOPS_DEBUG` | Enable debug logging | `false` |

Create a `.env` file in your project:

```env
ULUOPS_API_KEY=ulr_your-api-key-here
ULUOPS_REGISTRY_URL=https://registry.uluops.ai/api/v1
```

## Error Handling

The SDK provides typed error classes for precise error handling:

```typescript
import {
  RegistryApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  UnprocessableError,
  RateLimitError,
  ServiceUnavailableError,
  NetworkError,
  TimeoutError,
  isRegistryApiError,
} from '@uluops/registry-sdk/errors';

try {
  await client.definitions.get('agent', 'nonexistent');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Definition not found');
  } else if (error instanceof UnauthorizedError) {
    console.log('Please authenticate');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof ValidationError) {
    console.log('Invalid input:', error.details);
  } else if (error instanceof PayloadTooLargeError) {
    console.log('YAML exceeds 100KB limit');
  } else if (error instanceof UnprocessableError) {
    console.log('YAML is invalid:', error.details);
  } else if (isRegistryApiError(error)) {
    console.log(`API error: ${error.code} - ${error.message}`);
  }
}
```

### Error Classes

| Error | Status | Description |
|-------|--------|-------------|
| `ValidationError` | 400 | Invalid request data |
| `UnauthorizedError` | 401 | Authentication required |
| `ForbiddenError` | 403 | Access denied |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Resource conflict |
| `PayloadTooLargeError` | 413 | YAML exceeds 100KB limit |
| `UnprocessableError` | 422 | Valid request but semantically invalid |
| `RateLimitError` | 429 | Rate limit exceeded |
| `ServiceUnavailableError` | 503 | Server unavailable |
| `NetworkError` | - | Connection error |
| `TimeoutError` | - | Request timeout |

### Automatic Retries

The SDK automatically retries on transient errors (502, 503, 504, 429) with exponential backoff:

```typescript
const client = new RegistryClient({
  apiKey: 'ulr_...',
  retries: 3,        // Number of retry attempts (default: 3)
  timeout: 30000,    // Request timeout in ms (default: 30000)
});
```

## Advanced Usage

### Using the Low-Level HTTP Client

For advanced use cases, you can use `RegistryHttpClient` directly:

```typescript
import { RegistryHttpClient } from '@uluops/registry-sdk';

const http = new RegistryHttpClient({
  baseUrl: 'https://registry.uluops.ai/api/v1',
  apiKey: 'ulr_...',
});

// Make raw requests
const data = await http.get<MyType>('/custom/endpoint', { param: 'value' });
const result = await http.post<MyType>('/custom/endpoint', { body: 'data' });
```

### Loading Credentials Programmatically

```typescript
import { loadCredentials, loadConfig } from '@uluops/registry-sdk/config';

// Load from environment and config files
const credentials = loadCredentials();
console.log(credentials.apiKey);

// Load full config
const config = loadConfig();
console.log(config.baseUrl);
```

### Checking Rate Limits

```typescript
const client = new RegistryClient({ apiKey: 'ulr_...' });

await client.definitions.list();

const rateLimitInfo = client.getHttpClient().getRateLimitInfo();
if (rateLimitInfo) {
  console.log(`Remaining: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`);
  console.log(`Resets at: ${rateLimitInfo.resetAt}`);
}
```

## License

MIT License - see [LICENSE](./LICENSE) for details.
