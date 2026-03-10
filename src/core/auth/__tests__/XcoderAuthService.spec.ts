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
})
