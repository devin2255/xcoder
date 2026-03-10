import type { ExtensionContext } from "vscode"

import { XcoderSessionService } from "../XcoderSessionService"

describe("XcoderSessionService", () => {
	const secretStore: Record<string, string | undefined> = {}
	const globalStore: Record<string, string | undefined> = {}

	const mockSecrets = {
		get: vi.fn(async (key: string) => secretStore[key]),
		store: vi.fn(async (key: string, value: string) => {
			secretStore[key] = value
		}),
		delete: vi.fn(async (key: string) => {
			delete secretStore[key]
		}),
	}

	const mockGlobalState = {
		get: vi.fn((key: string) => globalStore[key]),
		update: vi.fn(async (key: string, value: string | undefined) => {
			if (value === undefined) {
				delete globalStore[key]
				return
			}

			globalStore[key] = value
		}),
	}

	const context = {
		secrets: mockSecrets,
		globalState: mockGlobalState,
	} as unknown as ExtensionContext

	let service: XcoderSessionService

	beforeEach(() => {
		for (const key of Object.keys(secretStore)) {
			delete secretStore[key]
		}
		for (const key of Object.keys(globalStore)) {
			delete globalStore[key]
		}

		vi.clearAllMocks()
		service = new XcoderSessionService(context)
	})

	it("preserves refresh token for expired sessions that can still be refreshed", async () => {
		secretStore["xcoder.auth.accessToken"] = "expired-access"
		secretStore["xcoder.auth.refreshToken"] = "refresh-token"
		globalStore["xcoder.auth.sessionMeta"] = JSON.stringify({
			expiresAt: "2026-03-09T00:00:00.000Z",
			user: { id: "user_123", email: "user@example.com" },
			entitlement: { status: "trial", trialEndsAt: "2026-03-16T00:00:00.000Z" },
		})

		const session = await service.clearIfExpired()

		expect(session).toMatchObject({
			accessToken: null,
			refreshToken: "refresh-token",
			expiresAt: null,
			user: { id: "user_123", email: "user@example.com" },
			entitlement: { status: "trial", trialEndsAt: "2026-03-16T00:00:00.000Z" },
		})
		expect(mockSecrets.delete).toHaveBeenCalledWith("xcoder.auth.accessToken")
		expect(secretStore["xcoder.auth.refreshToken"]).toBe("refresh-token")
		expect(JSON.parse(globalStore["xcoder.auth.sessionMeta"] || "{}")).toMatchObject({
			expiresAt: null,
			user: { id: "user_123", email: "user@example.com" },
			entitlement: { status: "trial", trialEndsAt: "2026-03-16T00:00:00.000Z" },
		})
	})

	it("clears fully expired sessions when no refresh token exists", async () => {
		secretStore["xcoder.auth.accessToken"] = "expired-access"
		globalStore["xcoder.auth.sessionMeta"] = JSON.stringify({
			expiresAt: "2026-03-09T00:00:00.000Z",
		})

		const session = await service.clearIfExpired()

		expect(session).toEqual({})
		expect(secretStore["xcoder.auth.accessToken"]).toBeUndefined()
		expect(secretStore["xcoder.auth.refreshToken"]).toBeUndefined()
		expect(globalStore["xcoder.auth.sessionMeta"]).toBeUndefined()
	})
})
