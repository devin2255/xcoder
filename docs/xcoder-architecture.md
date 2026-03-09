# xcoder Architecture (v1)

## Core Principle
Preserve Roo Code's local extension architecture and replace only the layers required for commercial operation:
- branding
- auth
- entitlements
- billing
- cloud configuration

## High-Level Architecture

### VS Code Extension
Responsibilities:
- sidebar/tab webview UI
- task lifecycle
- context management
- file edits / terminal / MCP / tools
- local code indexing
- entitlement checks before protected operations
- account / activation UI

### xcoder Cloud API
Responsibilities:
- auth/session
- user profile
- entitlement / plan status
- organization support (later)
- feature flags
- billing webhooks
- device registration

### Billing Provider
Responsibilities:
- checkout
- recurring subscription
- payment status
- customer portal

### Model Access Layer
Phase 1:
- BYOK only (OpenAI / Anthropic / Gemini / OpenRouter etc.)

Phase 2:
- xcoder-managed model proxy with quotas

## Extension Modules to Add

### `src/services/entitlement`
- entitlement service
- local cache
- status refresh
- feature checks

### `src/core/auth`
- auth session helpers
- account state
- sign-in / sign-out orchestration

### `src/core/paywall`
- guards
- paywall triggers
- trial banners

## Data Model (Cloud)

### users
- id
- email
- name
- created_at

### subscriptions
- id
- user_id
- plan
- status
- current_period_end
- cancel_at_period_end

### entitlements
- id
- user_id
- status
- trial_ends_at
- expires_at
- feature_set

### devices
- id
- user_id
- fingerprint
- label
- last_seen_at
- revoked_at

## Guarding Strategy
Use a single feature gate abstraction:

```ts
ensureEntitled(feature: 'chat' | 'tools' | 'mcp' | 'autoApprove')
```

Primary insertion points:
- new task creation
- outbound model requests
- tool execution
- MCP execution
- auto-approve toggles

## Upstream Compatibility Rules
- Keep upstream remote as `upstream`
- Prefer adapter replacement over core rewrites
- Keep xcoder-specific cloud logic behind interfaces where possible
- Avoid broad refactors until Phase 1 is stable
