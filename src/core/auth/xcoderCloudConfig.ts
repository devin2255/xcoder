export const XCODER_DEFAULT_API_URL = process.env.XCODER_API_URL || "https://api.xcoder.ai"
export const XCODER_DEFAULT_PROVIDER_URL = process.env.XCODER_PROVIDER_URL || "https://api.xcoder.ai/provider"
export const XCODER_DEFAULT_AUTH_URL = process.env.XCODER_AUTH_URL || "https://app.xcoder.ai"

export const getXcoderCloudConfig = () => ({
	apiUrl: XCODER_DEFAULT_API_URL,
	providerUrl: XCODER_DEFAULT_PROVIDER_URL,
	authUrl: XCODER_DEFAULT_AUTH_URL,
})
