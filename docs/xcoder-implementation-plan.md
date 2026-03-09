# xcoder Implementation Plan

## Goal
Build `xcoder`, a commercial VS Code AI coding assistant forked from Roo Code, with:
- feature parity with Roo Code as much as practical
- mandatory sign-in / activation before use
- paid subscription enforcement
- clean branding and independent cloud infrastructure
- ability to continue syncing upstream Roo Code updates

## Product Strategy
- Fork Roo Code, do not reimplement core agent/task/context logic.
- Replace branding, package ids, command prefixes, storage keys, cloud/auth endpoints.
- Add a thin entitlement gate around task/tool/model entrypoints.
- Start with "bring your own API key" billing model to minimize model-cost risk.
- Add hosted-model plans later.

## Workstreams

### 1) Branding / Fork Hygiene
- Rename extension id from `roo-cline` to `xcoder`
- Replace Roo Code branding, publisher, icons, links, texts
- Rename command ids / view ids / config prefixes / storage prefixes
- Keep Apache-2.0 notices and attribution

### 2) Cloud & Auth Replacement
- Introduce xcoder cloud config/env:
  - `XCODER_API_URL`
  - `XCODER_PROVIDER_URL`
  - `XCODER_AUTH_URL`
- Replace Roo cloud service implementation with xcoder cloud endpoints
- Implement login/session refresh/logout/user info

### 3) Entitlement Gate
- Add a central guard:
  - `ensureEntitled(feature)`
- Gate:
  - new task creation
  - model/provider calls
  - tool execution
  - MCP usage
  - auto-approval
- Support states:
  - anonymous
  - signed-in trial
  - active paid
  - expired / revoked

### 4) Billing
- subscription plans
- checkout + webhook sync
- account page
- trial limits
- device limits

### 5) Upstream Sync Strategy
- Keep upstream remote to Roo Code
- Keep xcoder-specific changes concentrated in adapters and guards
- Avoid unnecessary divergence in core task/context logic

## Delivery Phases

### Phase 0: Foundation
- [x] create local fork workspace
- [ ] rename package metadata / ids
- [ ] create implementation docs
- [ ] define cloud/auth API contract

### Phase 1: Rebrandable Baseline
- [ ] package / publisher / command prefix rename
- [ ] view ids / settings prefix rename
- [ ] UI copy / icons / homepage replacement
- [ ] build sanity check

### Phase 2: Auth + Entitlement MVP
- [ ] xcoder auth/session model
- [ ] entitlement service
- [ ] paywall / activation UI
- [ ] task gating

### Phase 3: Billing MVP
- [ ] plans
- [ ] checkout
- [ ] subscription sync
- [ ] device management

### Phase 4: Release Readiness
- [ ] telemetry
- [ ] docs
- [ ] marketplace packaging
- [ ] support / upgrade flow

## Immediate Next Steps
1. Rebrand the extension metadata and ids.
2. Add an xcoder architecture document.
3. Identify the smallest set of entrypoints for entitlement gating.
4. Stub xcoder cloud configuration and interfaces.
