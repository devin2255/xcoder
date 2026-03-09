import { getXcoderCloudConfig } from "./xcoderCloudConfig"
import type { XcoderSessionState } from "../../services/entitlement/XcoderSessionService"
import type { EntitlementState } from "../../services/entitlement/EntitlementService"

export type XcoderSessionResponse = {
	accessToken: string
	refreshToken?: string | null
	expiresAt?: string | null
	user?: XcoderSessionState["user"]
	entitlement?: EntitlementState | null
}

export class XcoderAuthApi {
	private readonly baseUrl: string

	constructor(baseUrl: string = getXcoderCloudConfig().apiUrl) {
		this.baseUrl = baseUrl.replace(/\/$/, "")
	}

	public async getSession(accessToken: string): Promise<XcoderSessionResponse> {
		return this.request<XcoderSessionResponse>("/v1/auth/session", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
	}

	public async refreshSession(refreshToken: string): Promise<XcoderSessionResponse> {
		return this.request<XcoderSessionResponse>("/v1/auth/refresh", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ refreshToken }),
		})
	}

	public async getEntitlement(accessToken: string): Promise<EntitlementState> {
		return this.request<EntitlementState>("/v1/me/entitlement", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
	}

	public async logout(args: { accessToken?: string | null; refreshToken?: string | null }) {
		return this.request<void>("/v1/auth/logout", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(args.accessToken ? { Authorization: `Bearer ${args.accessToken}` } : {}),
			},
			body: JSON.stringify({ refreshToken: args.refreshToken ?? null }),
		})
	}

	private async request<T>(path: string, init?: RequestInit): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, init)
		if (!response.ok) {
			throw new Error(`xcoder auth api request failed: ${response.status} ${response.statusText}`)
		}

		if (response.status === 204) {
			return undefined as T
		}

		return (await response.json()) as T
	}
}
