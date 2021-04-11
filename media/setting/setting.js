(function () {
  const vscode = acquireVsCodeApi();


  // -----------------------------------
  // Configure valid characters to input
  // -----------------------------------

  setInputFilter(document.querySelector("#apiClientId"), function(value) {
    return /^[0-9a-zA-Z_]*$/.test(value);
  });

  setInputFilter(document.querySelector("#apiClientSecret"), function(value) {
    return /^[0-9a-zA-Z_]*$/.test(value);
  });

  setInputFilter(document.querySelector("#certificate"), function(value) {
    return /^[A-Za-z0-9+/=]*$/gm.test(value);
  });

  setInputFilter(document.querySelector("#privateKey"), function(value) {
    return /^[A-Za-z0-9+/=]*$/gm.test(value);
  });

  setInputFilter(document.querySelector("#payerKey"), function(value) {
    return /^[.@~0-9A-Za-z+\-_]*$/.test(value);
  });

  // Check if user has informed configs
  requestHasSettings();


  // -------------------
  // Add event listeners
  // -------------------

  document.querySelector('#btnSaveSettings').addEventListener('click', () => {
    requestSaveSettings();
  });

  document.querySelector('#btnClearSettings').addEventListener('click', () => {
    requestClearSettings();
  });

  // ------------------------------------------------------
  // Handle messages sent from the extension to the webview
  // ------------------------------------------------------

  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type) {
      case 'responseHasSettings':
      {
        responseHasSettings(message.body.ok);
        break;
      }
      case 'responseSaveSettings':
      {
        responseSaveSettings(message.body.ok);
        break;
      }
      case 'responseClearSettings':
      {
        responseClearSettings(message.body.ok);
        break;
      }
    }
  });

  // ---------------------
  // Requests to Extension
  // ---------------------

  function requestHasSettings() {
    vscode.postMessage({ type: 'requestHasSettings' });
  }

  function requestSaveSettings() {
    let loading = document.querySelector('#loading');
    loading.style.display = 'block';

    let btn = document.querySelector('#btnSaveSettings');
    btn.setAttribute('disabled', 'disabled');

    let form = document.querySelector('#formSettings');
    let data = new FormData(form);

    let apiClientId = '';
    let apiClientSecret = '';
    let certificate = '';
    let privateKey = '';
    let payerKey = '';

    for (let [key, value] of data) {
      apiClientId = key === 'apiClientId' ? value : apiClientId;
      apiClientSecret = key === 'apiClientSecret' ? value : apiClientSecret;
      certificate = key === 'certificate' ? value : certificate;
      privateKey = key === 'privateKey' ? value : privateKey;
      payerKey = key === 'payerKey' ? value : payerKey;
    }

    vscode.postMessage({ type: 'requestSaveSettings', body: {
      apiClientId: apiClientId,
      apiClientSecret: apiClientSecret,
      certificate: certificate,
      privateKey: privateKey,
      payerKey: payerKey,
    } });
  }

  function requestClearSettings() {
    vscode.postMessage({ type: 'requestClearSettings' });
  }

  // ------------------------
  // Responses from Extension
  // ------------------------

  /**
   * @param {boolean} ok
   */
  function responseHasSettings(ok) {
    let containerSettings = document.querySelector('#containerSettings');
    let containerSettingsStatus = document.querySelector('#containerSettingsStatus');

    if (ok) {
      containerSettings.style.display = 'none';
      containerSettingsStatus.style.display = 'block';
      return;
    }
    containerSettings.style.display = 'block';
    containerSettingsStatus.style.display = 'none';
  }

  /**
   * @param {boolean} ok
   */
  function responseSaveSettings(ok) {
    let loading = document.querySelector('#loading');
    loading.style.display = 'none';

    let btn = document.querySelector('#btnSaveSettings');
    btn.removeAttribute('disabled');

    if (!ok) {
      return;
    }

    requestHasSettings();
  }

  /**
   * @param {boolean} ok
   */
  function responseClearSettings(ok) {
    if (!ok) {
      return;
    }

    requestHasSettings();
  }

}());
