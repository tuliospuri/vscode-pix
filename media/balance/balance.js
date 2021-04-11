(function () {
  const vscode = acquireVsCodeApi();

  // Check if user has informed configs
  requestHasSettings();


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
      case 'responseBalance':
        {
          responseBalance(message.body.value);
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

  function requestBalance() {
    let loader = document.querySelector('#loader');
    loader.style.display = 'block';

    vscode.postMessage({ type: 'requestBalance' });
  }

  // ------------------------
  // Responses from Extension
  // ------------------------

  /**
   * @param {boolean} ok
   */
  function responseHasSettings(ok) {
    let containerBalance = document.querySelector('#containerBalance');
    let containerSettingsStatus = document.querySelector('#containerSettingsStatus');

    if (ok) {
      requestBalance();
      containerBalance.style.display = 'block';
      containerSettingsStatus.style.display = 'none';
      return;
    }
    containerBalance.style.display = 'none';
    containerSettingsStatus.style.display = 'block';
  }

  /**
   * @param {string} str
   */
  function responseBalance(str) {

    if (!str) {
      return;
    }

    let loader = document.querySelector('#loader');
    loader.style.display = 'none';

    let div = document.querySelector('#balance');
    div.textContent = str;
  }

}());
