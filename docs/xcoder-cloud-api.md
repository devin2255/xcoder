# xcoder Cloud API Contract (MVP)

## Auth Model
xcoder extension authenticates against xcoder cloud and receives:
- access token (short-lived)
- refresh token or renewable session cookie
- user profile
- entitlement snapshot

## Base URLs
- App/Auth: `https://app.xcoder.ai`
- API: `https://api.xcoder.ai`
- Provider proxy (future): `https://api.xcoder.ai/provider`

## 1. Session

### `POST /v1/auth/login`
Start login flow or exchange credentials.

**Response**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "2026-03-09T12:00:00Z",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "玖月"
  },
  "entitlement": {
    "status": "trial",
    "plan": null,
    "trialEndsAt": "2026-03-16T12:00:00Z"
  }
}
```

### `POST /v1/auth/refresh`
Refresh access token.

### `POST /v1/auth/logout`
Invalidate local/remote session.

### `GET /v1/auth/session`
Return current authenticated user/session.

## 2. Entitlements

### `GET /v1/me/entitlement`
Return the user's current entitlement snapshot.

**Response**
```json
{
  "status": "active",
  "plan": "pro",
  "expiresAt": "2026-04-09T12:00:00Z",
  "features": {
    "chat": true,
    "tools": true,
    "mcp": true,
    "autoApprove": true
  },
  "deviceLimit": 2,
  "devicesInUse": 1
}
```

### `POST /v1/me/devices/register`
Register current extension/device fingerprint.

### `POST /v1/me/devices/revoke`
Revoke a prior device.

## 3. Billing

### `POST /v1/billing/checkout`
Create hosted checkout session.

**Request**
```json
{
  "plan": "pro-monthly",
  "successUrl": "vscode://xcoder/success",
  "cancelUrl": "vscode://xcoder/cancel"
}
```

### `GET /v1/billing/subscription`
Return subscription status for current user.

### `POST /v1/billing/webhook`
Provider webhook endpoint (Stripe/other).

## 4. Feature Flags

### `GET /v1/features`
Remote feature flags for rollout.

**Response**
```json
{
  "entitlementEnforced": true,
  "hostedModelsEnabled": false,
  "trialEnabled": true,
  "deviceLimit": true
}
```

## Extension Behavior

### On startup
1. Load cached session/entitlement.
2. Refresh session if needed.
3. Refresh entitlement snapshot.
4. If `entitlementEnforced = true`, block protected features when not entitled.

### Protected feature entrypoints
- create task
- tool execution
- MCP usage
- auto-approve enablement

## Error Codes
- `AUTH_REQUIRED`
- `SESSION_EXPIRED`
- `ENTITLEMENT_REQUIRED`
- `TRIAL_EXPIRED`
- `DEVICE_LIMIT_REACHED`
- `PLAN_FEATURE_UNAVAILABLE`
