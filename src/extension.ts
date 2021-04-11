import * as vscode from 'vscode';
import PixSettingViewProvider from './pix-setting';
import PixSendViewProvider from './pix-send';
import PixBalanceViewProvider from './pix-balance';

export function activate(context: vscode.ExtensionContext) {

	// Balance
	// -------
	const pixBalanceProvider = new PixBalanceViewProvider(context.extensionUri, context.secrets);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(PixBalanceViewProvider.viewType, pixBalanceProvider)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-pix.balance.settings', pixBalanceProvider.requestHasSettings, pixBalanceProvider)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-pix.balance.reload', pixBalanceProvider.requestBalance, pixBalanceProvider)
	);

	// Send
	// ----
	const pixSendProvider = new PixSendViewProvider(context.extensionUri, context.secrets);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(PixSendViewProvider.viewType, pixSendProvider)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-pix.send.settings', pixSendProvider.requestHasSettings, pixSendProvider)
	);

	// Settings
	// --------
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			PixSettingViewProvider.viewType,
			new PixSettingViewProvider(context.extensionUri, context.secrets)
		)
	);
}
