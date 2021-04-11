export type SettingsDTO = {
	apiClientId: string
	apiClientSecret: string
	certificate: string
	privateKey: string
	payerKey: string
};

export type PixSendDTO = {
	amount: string
	receiver: string
	payerKey: string
};

export enum PixSendResultReasons {
	accessTokenError = 1,
	missingWebhook = 2,
	generalError = 3,
	processing = 4,
}

export type PixSendResultDTO = {
	ok: boolean
	reason: PixSendResultReasons
};

export type TestSettingsResultDTO = {
	agent: boolean
	connection: boolean
	scopes: boolean
};
