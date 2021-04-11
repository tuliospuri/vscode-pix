export function isEvpKey(str: string): boolean {
  return /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(str);
}

export function isEmailKey(str: string): boolean {
  return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(str);
}

export function isPhoneKey(str: string): boolean {
  return /^[0-9]{11}$/.test(str);
}

export function isDocumentKey(str: string): boolean {
  return /^[0-9]{11,14}$/.test(str);
}

export function isApiClientId(str: string): boolean {
  return /^Client_Id_[0-9a-f]{40}$/.test(str);
}

export function isApiClientSecret(str: string): boolean {
  return /^Client_Secret_[0-9a-f]{40}$/.test(str);
}

export function isCertificate(str: string): boolean {
  return /^(-+BEGIN CERTIFICATE-+)(.*?)(-+END CERTIFICATE-+)$/s.test(str);
}

export function isPrivateKey(str: string): boolean {
  return /(-+BEGIN PRIVATE KEY-+)(.*?)(-+END PRIVATE KEY-+)/s.test(str);
}

export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
