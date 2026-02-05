# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-05

### Added
- `RegistryClient` with full CRUD operations for definitions, versions, validation, dependencies, forks, executions, translation, models, users, and render
- `RegistryHttpClient` with native fetch, retry logic with exponential backoff and jitter, and timeout handling via AbortController
- Authentication support for API key (`ulr_` prefix) and JWT session tokens
- Comprehensive error hierarchy: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `PayloadTooLargeError`, `UnprocessableError`, `RateLimitError`, `ServiceUnavailableError`, `NetworkError`, `TimeoutError`
- Rate limit info exposure via `getRateLimitInfo()`
- Configuration loading from environment variables and `.uluops/credentials.json`
- Zod validation schemas for all API types (exported for consumer use)
- Subpath exports: `@uluops/registry-sdk/types`, `/errors`, `/config`
- TypeScript strict mode with full type declarations
