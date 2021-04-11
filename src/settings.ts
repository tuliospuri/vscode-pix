import * as vscode from 'vscode';
import { SettingsDTO } from './types';

export default class Settings {

  constructor(
    private secretsStorage: vscode.SecretStorage,
  ) { }

  async exists(): Promise<boolean> {

    let secrets = [
      this.secretsStorage.get('apiClientId'),
      this.secretsStorage.get('apiClientSecret'),
      this.secretsStorage.get('certificate'),
      this.secretsStorage.get('privateKey'),
      this.secretsStorage.get('payerKey'),
    ];

    const values = await Promise.all(secrets);

    return !values.some(v => v === undefined);
  }

  async getAll(): Promise<SettingsDTO> {

    let secrets = [
      this.secretsStorage.get('apiClientId'),
      this.secretsStorage.get('apiClientSecret'),
      this.secretsStorage.get('certificate'),
      this.secretsStorage.get('privateKey'),
      this.secretsStorage.get('payerKey'),
    ];

    let [apiClientId, apiClientSecret, certificate, privateKey, payerKey] = await Promise.all(secrets);

    return {
      apiClientId: apiClientId!,
      apiClientSecret: apiClientSecret!,
      certificate: certificate!,
      privateKey: privateKey!,
      payerKey: payerKey!,
    };
  }
};
