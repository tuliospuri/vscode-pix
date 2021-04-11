import * as vscode from 'vscode';
import HttpUtil from './http-util';
import Settings from './settings';
import { getNonce } from './validator';

export default class PixBalanceViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'vscode-pix.balance';

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
						await this.requestHasSettings();
            break;
          }
				case 'requestBalance':
					{
						await this.requestBalance();
						break;
					}
			}
		});
	}

	public async requestBalance() {

		console.log('Starting requestBalance()');

    const settingsHelper = new Settings(this._secrets);
    const hasSettings = await settingsHelper.exists();
    const settings = await settingsHelper.getAll();

    if (!hasSettings) {

      vscode.window.showErrorMessage('Extensão não ativada. Acesse a aba configuração');
			this._view!.webview.postMessage({ type: 'responseBalance', body: {value: ''} });
      return;
    }

		const httpUtil = new HttpUtil(settings);
		const ok = await httpUtil.init();
    const balance = await httpUtil.getBalance();

    if (ok && balance) {
			this._view!.webview.postMessage({ type: 'responseBalance', body: {value:  `R$ ${balance}`} });
      return;
    }

		this._view!.webview.postMessage({ type: 'responseBalance', body: {value: ''} });
	}

	public async requestHasSettings() {

		const settings = new Settings(this._secrets);
		const exists = await settings.exists();

		console.log('hasSettings', exists);
		this._view!.webview.postMessage({ type: 'responseHasSettings', body: {ok: exists} });
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUtilUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'util.js'));
		const scriptBalanceUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'balance', 'balance.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'balance', 'balance.css'));

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

        <div id="containerBalance">
          <section>
            <p id="balance"></p>
						<div id="loader"></div>
          </section>
        </div>

        <div id="containerSettingsStatus">
          <p><span class="redCircle"></span> Aguardando ativação.</p>
          <p>Acesse a aba configuração.</p>
        </div>

				<script nonce="${nonce}" src="${scriptUtilUri}"></script>
				<script nonce="${nonce}" src="${scriptBalanceUri}"></script>
			</body>
			</html>`;
	}
}
