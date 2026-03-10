import { entitlementService } from "../../../services/entitlement/EntitlementService"
import type { XcoderSessionService, XcoderSessionState } from "../../../services/entitlement/XcoderSessionService"
import type { XcoderAuthApi } from "../XcoderAuthApi"
import { XcoderAuthService } from "../XcoderAuthService"

describe("XcoderAuthService", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		entitlementService.setEntitlement({ status: "anonymous" })
	})

	it("refreshes a refreshable expired session and persists the new auth state", async () => {
		const expiredSession: XcoderSessionState = {
			accessToken: null,
			refreshToken: "refresh-token",
			user: { id: "user_123", email: "user@example.com" },
			entitlement: { status: "trial", trialEndsAt: "2026-03-16T00:00:00.000Z" },
		}

		const sessionService = {
			clearIfExpired: vi.fn().mockResolvedValue(expiredSession),
			shouldRefreshSoon: vi.fn().mockReturnValue(true),
			setSession: vi.fn().mockResolvedValue(undefined),
			getSession: vi.fn(),
			updateEntitlement: vi.fn(),
			clearSession: vi.fn(),
		} as unknown as XcoderSessionService

		const authApi = {
			refreshSession: vi.fn().mockResolvedValue({
				accessToken: "fresh-access-token",
				refreshToken: "fresh-refresh-token",
				expiresAt: "2026-03-10T12:00:00.000Z",
				user: { id: "user_123", email: "user@example.com", name: "玖月" },
				entitlement: { status: "active", plan: "pro" },
			}),
		} as unknown as XcoderAuthApi

		const service = new XcoderAuthService(sessionService, authApi)
		const nextSession = await service.refreshSessionIfNeeded()

		expect(authApi.refreshSession).toHaveBeenCalledWith("refresh-token")
		expect(sessionService.setSession).toHaveBeenCalledWith({
			accessToken: "fresh-access-token",
			refreshToken: "fresh-refresh-token",
			expiresAt: "2026-03-10T12:00:00.000Z",
			user: { id: "user_123", email: "user@example.com", name: "玖月" },
			entitlement: { status: "active", plan: "pro" },
		})
		expect(nextSession).toMatchObject({
			accessToken: "fresh-access-token",
			refreshToken: "fresh-refresh-token",
			entitlement: { status: "active", plan: "pro" },
		})
		expect(entitlementService.getEntitlement()).toEqual({ status: "active", plan: "pro" })
	})

	it("reuses healthy sessions without refreshing and hydrates runtime entitlement state", async () => {
		const activeSession: XcoderSessionState = {
			accessToken: "healthy-access-token",
			refreshToken: "refresh-token",
			expiresAt: "2099-03-10T12:00:00.000Z",
			entitlement: { status: "active", plan: "pro" },
		}

		const sessionService = {
			clearIfExpired: vi.fn().mockResolvedValue(activeSession),
			shouldRefreshSoon: vi.fn().mockReturnValue(false),
			setSession: vi.fn(),
			getSession: vi.fn(),
			updateEntitlement: vi.fn(),
			clearSession: vi.fn(),
		} as unknown as XcoderSessionService

		const authApi = {
			refreshSession: vi.fn(),
		} as unknown as XcoderAuthApi

		const service = new XcoderAuthService(sessionService, authApi)
		const session = await service.refreshSessionIfNeeded()

		expect(authApi.refreshSession).not.toHaveBeenCalled()
		expect(sessionService.setSession).not.toHaveBeenCalled()
		expect(session).toEqual(activeSession)
		expect(entitlementService.getEntitlement()).toEqual({ status: "active", plan: "pro" })
	})

	it("syncs entitlement snapshots into persistence and runtime state", async () => {
		const activeSession: XcoderSessionState = {
			accessToken: "healthy-access-token",
			refreshToken: "refresh-token",
			expiresAt: "2099-03-10T12:00:00.000Z",
			user: { id: "user_123", email: "user@example.com" },
			entitlement: { status: "trial", trialEndsAt: "2026-03-16T00:00:00.000Z" },
		}

		const sessionService = {
			clearIfExpired: vi.fn().mockResolvedValue(activeSession),
			shouldRefreshSoon: vi.fn().mockReturnValue(false),
			setSession: vi.fn(),
			getSession: vi.fn().mockResolvedValue({
				...activeSession,
				entitlement: { status: "active", plan: "pro" },
			}),
			updateEntitlement: vi.fn().mockResolvedValue(undefined),
			clearSession: vi.fn(),
		} as unknown as XcoderSessionService

		const authApi = {
			getEntitlement: vi.fn().mockResolvedValue({ status: "active", plan: "pro" }),
			refreshSession: vi.fn(),
		} as unknown as XcoderAuthApi

		const service = new XcoderAuthService(sessionService, authApi)
		const session = await service.syncEntitlement()

		expect(authApi.getEntitlement).toHaveBeenCalledWith("healthy-access-token")
		expect(sessionService.updateEntitlement).toHaveBeenCalledWith({ status: "active", plan: "pro" })
		expect(session).toMatchObject({
			accessToken: "healthy-access-token",
			entitlement: { status: "active", plan: "pro" },
		})
		expect(entitlementService.getEntitlement()).toEqual({ status: "active", plan: "pro" })
	})

	it("clears persisted and runtime state after logout", async () => {
		const sessionService = {
			getSession: vi.fn().mockResolvedValue({
				accessToken: "access-token",
				refreshToken: "refresh-token",
			}),
			clearSession: vi.fn().mockResolvedValue(undefined),
			clearIfExpired: vi.fn(),
			shouldRefreshSoon: vi.fn(),
			setSession: vi.fn(),
			updateEntitlement: vi.fn(),
		} as unknown as XcoderSessionService

		const authApi = {
			logout: vi.fn().mockResolvedValue(undefined),
		} as unknown as XcoderAuthApi

		entitlementService.setEntitlement({ status: "active", plan: "pro" })

		const service = new XcoderAuthService(sessionService, authApi)
		await service.logout()

		expect(authApi.logout).toHaveBeenCalledWith({
			accessToken: "access-token",
			refreshToken: "refresh-token",
		})
		expect(sessionService.clearSession).toHaveBeenCalledTimes(1)
		expect(entitlementService.getEntitlement()).toEqual({ status: "anonymous" })
	})

	it("still clears persisted and runtime state when remote logout fails", async () => {
		const sessionService = {
			getSession: vi.fn().mockResolvedValue({
				accessToken: "access-token",
				refreshToken: "refresh-token",
			}),
			clearSession: vi.fn().mockResolvedValue(undefined),
			clearIfExpired: vi.fn(),
			shouldRefreshSoon: vi.fn(),
			setSession: vi.fn(),
			updateEntitlement: vi.fn(),
		} as unknown as XcoderSessionService

		const authApi = {
			logout: vi.fn().mockRejectedValue(new Error("logout failed")),
		} as unknown as XcoderAuthApi

		entitlementService.setEntitlement({ status: "active", plan: "pro" })

		const service = new XcoderAuthService(sessionService, authApi)
		await expect(service.logout()).rejects.toThrow("logout failed")

		expect(sessionService.clearSession).toHaveBeenCalledTimes(1)
		expect(entitlementService.getEntitlement()).toEqual({ status: "anonymous" })
	})

	it("skips remote logout when no cached session exists", async () => {
		const sessionService = {
			getSession: vi.fn().mockResolvedValue({}),
			clearSession: vi.fn().mockResolvedValue(undefined),
			clearIfExpired: vi.fn(),
			shouldRefreshSoon: vi.fn(),
			setSession: vi.fn(),
			updateEntitlement: vi.fn(),
		} as unknown as XcoderSessionService

		const authApi = {
			logout: vi.fn(),
		} as unknown as XcoderAuthApi

		const service = new XcoderAuthService(sessionService, authApi)
		await service.logout()

		expect(authApi.logout).not.toHaveBeenCalled()
		expect(sessionService.clearSession).toHaveBeenCalledTimes(1)
		expect(entitlementService.getEntitlement()).toEqual({ status: "anonymous" })
	})
})
