export type EntitlementFeature = "chat" | "tools" | "mcp" | "autoApprove"

export type EntitlementState =
	| { status: "anonymous" }
	| { status: "trial"; trialEndsAt?: string | null }
	| { status: "active"; plan?: string | null; expiresAt?: string | null }
	| { status: "expired"; expiresAt?: string | null }
	| { status: "revoked" }

export class EntitlementRequiredError extends Error {
	constructor(
		public readonly feature: EntitlementFeature,
		public readonly entitlement: EntitlementState,
	) {
		super(`xcoder entitlement required for feature: ${feature}`)
		this.name = "EntitlementRequiredError"
	}
}

/**
 * Phase-1 local entitlement guard.
 *
 * For now this is intentionally minimal and defaults to allowing access when
 * an explicit xcoder entitlement source has not yet been wired in.
 *
 * In the next step this service will be hydrated from xcoder cloud auth/session
 * state and cached in extension storage.
 */
export class EntitlementService {
	private entitlement: EntitlementState = { status: "anonymous" }

	public setEntitlement(entitlement: EntitlementState) {
		this.entitlement = entitlement
	}

	public getEntitlement(): EntitlementState {
		return this.entitlement
	}

	public hasAccess(_feature: EntitlementFeature): boolean {
		switch (this.entitlement.status) {
			case "active":
			case "trial":
				return true
			case "anonymous":
			case "expired":
			case "revoked":
			default:
				return false
		}
	}

	public ensureAccess(feature: EntitlementFeature) {
		if (!this.hasAccess(feature)) {
			throw new EntitlementRequiredError(feature, this.entitlement)
		}
	}
}

export const entitlementService = new EntitlementService()
