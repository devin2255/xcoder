import { beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"

import { ClineProvider } from "../core/webview/ClineProvider"

vi.mock("../core/task/Task", () => ({
	Task: class TaskStub {},
}))

vi.mock("../i18n", () => ({
	t: (key: string) => key,
}))

vi.mock("@roo-code/cloud", () => ({
	CloudService: {
		hasInstance: vi.fn().mockReturnValue(false),
		instance: {
			logout: vi.fn(),
		},
	},
}))

describe("ClineProvider.resetState xcoder auth cleanup", () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		vi.spyOn(vscode.window, "showInformationMessage").mockResolvedValue("common:answers.yes" as never)
	})

	it("continues reset after xcoder logout errors while still invoking the cleanup path", async () => {
		const provider = {
			xcoderAuthService: {
				logout: vi.fn().mockRejectedValue(new Error("xcoder logout failed")),
			},
			contextProxy: {
				resetAllState: vi.fn().mockResolvedValue(undefined),
			},
			providerSettingsManager: {
				resetAllConfigs: vi.fn().mockResolvedValue(undefined),
			},
			customModesManager: {
				resetCustomModes: vi.fn().mockResolvedValue(undefined),
			},
			removeClineFromStack: vi.fn().mockResolvedValue(undefined),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			postMessageToWebview: vi.fn().mockResolvedValue(undefined),
			log: vi.fn(),
		} as unknown as ClineProvider

		await (ClineProvider.prototype as any).resetState.call(provider)

		expect(provider.xcoderAuthService.logout).toHaveBeenCalledTimes(1)
		expect(provider.contextProxy.resetAllState).toHaveBeenCalledTimes(1)
		expect(provider.providerSettingsManager.resetAllConfigs).toHaveBeenCalledTimes(1)
		expect(provider.customModesManager.resetCustomModes).toHaveBeenCalledTimes(1)
		expect(provider.removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(provider.postStateToWebview).toHaveBeenCalledTimes(1)
		expect(provider.postMessageToWebview).toHaveBeenCalledWith({
			type: "action",
			action: "chatButtonClicked",
		})
		expect(provider.log).toHaveBeenCalledWith(
			"[xcoder] Failed to clear cached auth state during reset: xcoder logout failed",
		)
	})
})
