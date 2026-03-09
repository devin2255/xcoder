import { entitlementService } from "../../services/entitlement/EntitlementService"
import { XcoderSessionService, type XcoderSessionState } from "../../services/entitlement/XcoderSessionService"
import { XcoderAuthApi } from "./XcoderAuthApi"

export class XcoderAuthService {
	constructor(
		private readonly sessionService: XcoderSessionService,
		private readonly authApi: XcoderAuthApi = new XcoderAuthApi(),
	) {}

	public async refreshSessionIfNeeded(): Promise<XcoderSessionState | null> {
		const session = await this.sessionService.clearIfExpired()
		if (!session.refreshToken) {
			return session.accessToken ? session : null
		}

		if (session.accessToken && !this.sessionService.shouldRefreshSoon(session)) {
			return session
		}

		const refreshed = await this.authApi.refreshSession(session.refreshToken)
		const nextSession: XcoderSessionState = {
			...session,
			accessToken: refreshed.accessToken,
			refreshToken: refreshed.refreshToken ?? session.refreshToken,
			expiresAt: refreshed.expiresAt ?? session.expiresAt ?? null,
			user: refreshed.user ?? session.user ?? null,
			entitlement: refreshed.entitlement ?? session.entitlement ?? null,
		}

		await this.sessionService.setSession(nextSession)
		if (nextSession.entitlement) {
			entitlementService.setEntitlement(nextSession.entitlement)
		}

		return nextSession
	}

	public async syncEntitlement(): Promise<XcoderSessionState | null> {
		const session = await this.sessionService.clearIfExpired()
		if (!session.accessToken) {
			return null
		}

		const entitlement = await this.authApi.getEntitlement(session.accessToken)
		await this.sessionService.updateEntitlement(entitlement)
		entitlementService.setEntitlement(entitlement)
		return {
			...(await this.sessionService.getSession()),
			entitlement,
		}
	}

	public async logout(): Promise<void> {
		const session = await this.sessionService.getSession()
		try {
			await this.authApi.logout({
				accessToken: session.accessToken,
				refreshToken: session.refreshToken,
			})
		} finally {
			await this.sessionService.clearSession()
			entitlementService.setEntitlement({ status: "anonymous" })
		}
	}
}
