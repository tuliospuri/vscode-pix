import fetch from 'node-fetch';
import * as https from 'https';
import { SettingsDTO, PixSendDTO, PixSendResultDTO, PixSendResultReasons } from './types';

const sslValidator = require('ssl-validator');
const { isValidSSLCert, isValidSSLKey } = sslValidator;

export default class HttpUtil {

  private static readonly baseUrl = 'https://api-pix.gerencianet.com.br';

  constructor(
    private settings: SettingsDTO,
    private agent?: https.Agent,
  ) { }

  async init(): Promise<boolean> {
    try {
      this.agent = await this.getHttpAgent(
        this.settings.certificate,
        this.settings.privateKey
      );
      return true;

    } catch (err) {
      console.error(err);
    }
    return false;
  }

  private async getHttpAgent(cert: string, key: string): Promise<https.Agent> {

    if (!(await isValidSSLCert(cert))) {
      throw new Error("Invalid Certificate");
    }

    if (!(await isValidSSLKey(key))) {
      throw new Error("Invalid Private Key");
    }

    return new https.Agent({
      cert: cert,
      key: key,
      keepAlive: false,
      rejectUnauthorized: true
    });
  }

  private getCommonHeaders() {
    return {
      'content-type': 'application/json',
      'user-agent': 'Pix @ VSCode',
    };
  }

  private async oauthToken(): Promise<any> {

    console.log('Starting oauthToken()');

		const endpoint = `${HttpUtil.baseUrl}/oauth/token`;

		const basic = 'Basic ' + Buffer.from(`${this.settings.apiClientId}:${this.settings.apiClientSecret}`).toString('base64');

		const body = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'grant_type': 'client_credentials',
		};

    try {
      const options = {
        headers: {...this.getCommonHeaders(), ...{'authorization': basic}},
        agent: this.agent,
        method: 'post',
        body: JSON.stringify(body),
      };

			const response = await fetch(endpoint, options);
			return await response.json();

		} catch (err) {
			console.error('Error oauthToken()', err);
		}
    return '';
  }

  async getScopes(): Promise<string> {

    console.log('Starting getScopes()');

    const json = await this.oauthToken();

    if (json.scope) {
      return json.scope;
    }
    return '';
	}

  async getAccessToken(): Promise<string> {

		console.log('Starting getAccessToken()');

    const json = await this.oauthToken();

    if (json.access_token) {
      return json.access_token;
    }
    return '';
	}

  async pixSend(data: PixSendDTO): Promise<PixSendResultDTO> {

    console.log('Starting pixSend()');

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return {
        ok: false,
        reason: PixSendResultReasons.accessTokenError,
      };
    }

		const endpoint = `${HttpUtil.baseUrl}/v2/pix`;
		const bearer = `Bearer ${accessToken}`;
    const body = {
      'valor': data.amount,
      'pagador': {
        'chave': data.payerKey,
      },
      'favorecido': {
        'chave': data.receiver,
      }
    };

    try {
      const options = {
        headers: {...this.getCommonHeaders(), ...{'authorization': bearer}},
        agent: this.agent,
        method: 'post',
        body: JSON.stringify(body),
      };

			const response = await fetch(endpoint, options);
			const json = await response.json();

      if (json.e2eId && json.status === 'EM_PROCESSAMENTO') {
        return {
          ok: true,
          reason: PixSendResultReasons.processing,
        };

      } else if (json.nome && json.nome === 'conta_chave_sem_webhook') {
        return {
          ok: false,
          reason: PixSendResultReasons.missingWebhook,
        };
      }
		} catch (err) {
			console.error('Error pixSend()', err);
		}

    return {
      ok: false,
      reason: PixSendResultReasons.generalError,
    };
  }

  async getBalance(): Promise<string> {

    console.log('Starting getBalance()');

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return '';
    }

    const endpoint = `${HttpUtil.baseUrl}/v2/gn/saldo`;
		const bearer = `Bearer ${accessToken}`;

    try {
      const options = {
        headers: {...this.getCommonHeaders(), ...{'authorization': bearer}},
        agent: this.agent,
      };

			const response = await fetch(endpoint, options);
			const json = await response.json();

      if (json.saldo) {
        return json.saldo;
      }
		} catch (err) {
			console.error('Error getBalance()', err);
		}
    return '';
  }
}
