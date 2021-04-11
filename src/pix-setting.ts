import * as vscode from 'vscode';
import HttpUtil from './http-util';
import Settings from './settings';
import { SettingsDTO, TestSettingsResultDTO } from './types';
import { getNonce } from './validator';

import {
	isEvpKey,
	isEmailKey,
	isPhoneKey,
	isDocumentKey,
	isApiClientId,
	isApiClientSecret,
	isCertificate,
	isPrivateKey } from './validator';

export default class PixSettingViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'vscode-pix.settings';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private _secrets: vscode.SecretStorage,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async data => {
			switch (data.type) {
				case 'requestHasSettings':
					{
						const settings = new Settings(this._secrets);
						const exists = await settings.exists();

						console.log('hasSettings', exists);
						this._view!.webview.postMessage({ type: 'responseHasSettings', body: {ok: exists} });
						break;
					}
				case 'requestSaveSettings':
					{
						let body = data.body ? data.body : null;
						await this.requestSaveSettings(body);
						break;
					}
				case 'requestClearSettings':
					{
						this.requestClearSettings();
						break;
					}
			}
		});
	}

	async requestSaveSettings(body: SettingsDTO): Promise<void> {

		if (!isEvpKey(body.payerKey) && !isEmailKey(body.payerKey) && !isDocumentKey(body.payerKey) && !isPhoneKey(body.payerKey)) {
			this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: false} });
			vscode.window.showErrorMessage('Chave do pagador informada não é válida.');
			return;
		}

		if (!isApiClientId(body.apiClientId)) {
			this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: false} });
			vscode.window.showErrorMessage('API Client Id informado não é válido');
			return;
		}

		if (!isApiClientSecret(body.apiClientSecret)) {
			this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: false} });
			vscode.window.showErrorMessage('API Client Secret informado não é válido.');
			return;
		}

		if (!isCertificate(body.certificate)) {
			this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: false} });
			vscode.window.showErrorMessage('Certificado informado não é válido.');
			return;
		}

		if (!isPrivateKey(body.privateKey)) {
			this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: false} });
			vscode.window.showErrorMessage('Chave privada informada não é válida.');
			return;
		}

		const test = await this.testSettings(body);

		console.log('test', test);

		if (!test.agent) {
			this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: false} });
			vscode.window.showErrorMessage('Certificado inválido, revise as configurações informadas.');
			return;
		}

		if (!test.connection) {
			this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: false} });
			vscode.window.showErrorMessage('Conexão não estabelecida, revise as configurações informadas.');
			return;
		}

		if (!test.scopes) {
			this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: false} });
			vscode.window.showErrorMessage('Escopos insuficientes, necessário gn.balance.read e pix.send.');
			return;
		}

		let secrets = [
			this._secrets.store('apiClientId', body.apiClientId),
			this._secrets.store('apiClientSecret', body.apiClientSecret),
			this._secrets.store('certificate', body.certificate),
			this._secrets.store('privateKey', body.privateKey),
			this._secrets.store('payerKey', body.payerKey),
		];

		await Promise.all(secrets);

		this._view!.webview.postMessage({ type: 'responseSaveSettings', body: {ok: true} });

		setTimeout(() => {
			vscode.commands.executeCommand('vscode-pix.balance.settings');
			vscode.commands.executeCommand('vscode-pix.send.settings');
		}, 300);
	}

	async requestClearSettings() {
		let secrets = [
			this._secrets.delete('apiClientId'),
			this._secrets.delete('apiClientSecret'),
			this._secrets.delete('certificate'),
			this._secrets.delete('privateKey'),
			this._secrets.delete('payerKey'),
		];

		await Promise.all(secrets);

		this._view!.webview.postMessage({ type: 'responseClearSettings', body: {ok: true} });
		vscode.commands.executeCommand('vscode-pix.balance.settings');
		vscode.commands.executeCommand('vscode-pix.send.settings');
	}

	private async testSettings(settings: SettingsDTO): Promise<TestSettingsResultDTO> {

		const httpUtil = new HttpUtil(settings);
		const ok = await httpUtil.init();

		const strScopes = await httpUtil.getScopes();
		const scopes = strScopes.split(' ');
		const correctScopes = scopes.includes('gn.balance.read') && scopes.includes('pix.send');

		return {
			agent: ok,
			connection: !!strScopes,
			scopes: correctScopes,
		};
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUtilUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'util.js'));
		const scriptSettingsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'setting', 'setting.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'setting', 'setting.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="pt-br">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Pix</title>
			</head>
			<body>
				<div id="loading"></div>

				<div id="containerSettings">
					<section>
						<form id="formSettings">
							<label>Chave do pagador</label>
							<input type="text" name="payerKey" id="payerKey">

							<label>API Client Id</label>
							<input type="text" name="apiClientId" id="apiClientId">

							<label>API Client Secret</label>
							<input type="text" name="apiClientSecret" id="apiClientSecret">

							<label>Certificado</label>
							<textarea name="certificate" id="certificate"></textarea>

							<label>Chave privada</label>
							<textarea name="privateKey" id="privateKey"></textarea>

							<button id="btnSaveSettings">Salvar com segurança</button>
						</form>
					</section>
				</div>

        <div id="containerSettingsStatus">
					<p><span class="greenCircle"></span> Extensão ativada.</p>
				  <p>Para desativar <a href="" id="btnClearSettings">clique aqui</a>.</p>
        </div>

				<script nonce="${nonce}" src="${scriptUtilUri}"></script>
				<script nonce="${nonce}" src="${scriptSettingsUri}"></script>
			</body>
			</html>`;
	}
}
