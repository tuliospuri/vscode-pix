import * as vscode from 'vscode';
import HttpUtil from './http-util';
import Settings from './settings';
import { PixSendDTO, PixSendResultReasons } from './types';
import { isEvpKey, isEmailKey, isPhoneKey, isDocumentKey, getNonce } from './validator';

export default class PixSendViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'vscode-pix.send';

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
				case 'requestPixSend':
					{
						let body = data.body ? data.body : null;
						await this.requestPixSend(body);
						break;
					}
			}
		});
	}

  private async requestPixSend(body: PixSendDTO) {

		console.log('Starting requestPixSend()');

		if (!body) {
      this._view!.webview.postMessage({ type: 'responsePixSend', body: {ok: false} });
			return;
		}

    const settingsHelper = new Settings(this._secrets);
    const hasSettings = await settingsHelper.exists();
    const settings = await settingsHelper.getAll();

    if (!hasSettings) {

      vscode.window.showErrorMessage('Extensão não ativada. Acesse a aba configuração');
			this._view!.webview.postMessage({ type: 'responsePixSend', body: {ok: false} });
      return;
    }

		if (!isEvpKey(body.receiver) && !isEmailKey(body.receiver) && !isDocumentKey(body.receiver) && !isPhoneKey(body.receiver)) {

      vscode.window.showErrorMessage('Chave do recebedor deve ser celular, e-mail, documento ou chave aleatória.');
			this._view!.webview.postMessage({ type: 'responsePixSend', body: {ok: false} });
			return;
		}

		body.payerKey = settings.payerKey;

		const httpUtil = new HttpUtil(settings);
		const ok = await httpUtil.init();
    const sent = await httpUtil.pixSend(body);

    if (ok && sent.ok) {
			this._view!.webview.postMessage({ type: 'responsePixSend', body: {ok: true} });
			vscode.window.showInformationMessage('Pix enviado 💸');
			vscode.commands.executeCommand('vscode-pix.balance.reload');
      return;

    } else if (ok && !sent.ok && sent.reason === PixSendResultReasons.missingWebhook) {
			this._view!.webview.postMessage({ type: 'responsePixSend', body: {ok: false} });
			vscode.window.showErrorMessage('Webhook não cadastrado na chave do pagador.');
      return;

		}

    this._view!.webview.postMessage({ type: 'responsePixSend', body: {ok: false} });
    vscode.window.showErrorMessage('Erro ao enviar o Pix');
    return;
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
		const scriptSendUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'send', 'send.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'send', 'send.css'));

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

        <div id="containerDashboard">
          <section>
            <form id="formSend">
              <label>Chave do recebedor</label>
              <input type="text" name="receiver" id="receiver">

              <label>Valor</label>
              <input type="text" name="amount" id="amount">

              <button id="btnSend">Enviar Pix</button>
            </form>
          </section>
        </div>

        <div id="containerSettingsStatus">
					<p><span class="redCircle"></span> Aguardando ativação.</p>
					<p>Acesse a aba configuração.</p>
        </div>

				<script nonce="${nonce}" src="${scriptUtilUri}"></script>
				<script nonce="${nonce}" src="${scriptSendUri}"></script>
			</body>
			</html>`;
	}
}
