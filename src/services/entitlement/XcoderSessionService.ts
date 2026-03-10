import type * as vscode from "vscode"

import type { EntitlementState } from "./EntitlementService"

export type XcoderUser = {
	id: string
	email: string
	name?: string | null
}

export type XcoderSessionState = {
	accessToken?: string | null
	refreshToken?: string | null
	expiresAt?: string | null
	user?: XcoderUser | null
	entitlement?: EntitlementState | null
	updatedAt?: number
}

const ACCESS_TOKEN_KEY = "xcoder.auth.accessToken"
const REFRESH_TOKEN_KEY = "xcoder.auth.refreshToken"
const SESSION_META_KEY = "xcoder.auth.sessionMeta"
const DEFAULT_REFRESH_THRESHOLD_MS = 5 * 60 * 1000

export class XcoderSessionService {
	constructor(private readonly context: vscode.ExtensionContext) {}

	public async getSession(): Promise<XcoderSessionState> {
		const accessToken = await this.context.secrets.get(ACCESS_TOKEN_KEY)
		const refreshToken = await this.context.secrets.get(REFRESH_TOKEN_KEY)
		const metaRaw = this.context.globalState.get<string>(SESSION_META_KEY)

		let meta: Omit<XcoderSessionState, "accessToken" | "refreshToken"> = {}
		if (metaRaw) {
			try {
				meta = JSON.parse(metaRaw) as Omit<XcoderSessionState, "accessToken" | "refreshToken">
			} catch {
				meta = {}
			}
		}

		return {
			...meta,
			accessToken,
			refreshToken,
		}
	}

	public async hasActiveSession(): Promise<boolean> {
		const session = await this.getSession()
		return !!session.accessToken && !this.isExpired(session)
	}

	public async clearIfExpired(): Promise<XcoderSessionState> {
		const session = await this.getSession()
		if (!this.isExpired(session)) {
			return session
		}

		if (session.refreshToken) {
			const refreshableSession: XcoderSessionState = {
				...session,
				accessToken: null,
				expiresAt: null,
			}
			await this.setSession(refreshableSession)
			return refreshableSession
		}

		await this.clearSession()
		return {}
	}

	public isExpired(session: XcoderSessionState): boolean {
		if (!session.expiresAt) {
			return false
		}

		const expiresAt = new Date(session.expiresAt).getTime()
		if (Number.isNaN(expiresAt)) {
			return false
		}

		return expiresAt <= Date.now()
	}

	public shouldRefreshSoon(
		session: XcoderSessionState,
		thresholdMs: number = DEFAULT_REFRESH_THRESHOLD_MS,
	): boolean {
		if (!session.expiresAt) {
			return false
		}

		const expiresAt = new Date(session.expiresAt).getTime()
		if (Number.isNaN(expiresAt)) {
			return false
		}

		return expiresAt - Date.now() <= thresholdMs
	}

	public async updateEntitlement(entitlement: EntitlementState | null | undefined): Promise<void> {
		const session = await this.getSession()
		await this.setSession({
			...session,
			entitlement: entitlement ?? null,
		})
	}

	public async setSession(session: XcoderSessionState): Promise<void> {
		await Promise.all([
			session.accessToken
				? this.context.secrets.store(ACCESS_TOKEN_KEY, session.accessToken)
				: this.context.secrets.delete(ACCESS_TOKEN_KEY),
			session.refreshToken
				? this.context.secrets.store(REFRESH_TOKEN_KEY, session.refreshToken)
				: this.context.secrets.delete(REFRESH_TOKEN_KEY),
			this.context.globalState.update(
				SESSION_META_KEY,
				JSON.stringify({
					expiresAt: session.expiresAt ?? null,
					user: session.user ?? null,
					entitlement: session.entitlement ?? null,
					updatedAt: Date.now(),
				}),
			),
		])
	}

	public async clearSession(): Promise<void> {
		await Promise.all([
			this.context.secrets.delete(ACCESS_TOKEN_KEY),
			this.context.secrets.delete(REFRESH_TOKEN_KEY),
			this.context.globalState.update(SESSION_META_KEY, undefined),
		])
	}
}
