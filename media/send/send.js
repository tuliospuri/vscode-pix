(function () {
  const vscode = acquireVsCodeApi();


  // -----------------------------------
  // Configure valid characters to input
  // -----------------------------------

  setInputFilter(document.querySelector("#receiver"), function(value) {
    return /^[.@~0-9A-Za-z+\-_]*$/.test(value);
  });

  setInputFilter(document.querySelector("#amount"), function(value) {
    return /^\d*\.?\d{0,2}$/.test(value);
  });


  // Check if user has informed configs
  requestHasSettings();


  // -------------------
  // Add event listeners
  // -------------------

  document.querySelector('#btnSend').addEventListener('click', () => {
    requestSendPix();
  });

  // ------------------------------------------------------
  // Handle messages sent from the extension to the webview
  // ------------------------------------------------------

  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type) {
      case 'responsePixSend':
        {
          responsePixSend(message.body.ok);
          break;
        }
      case 'responseHasSettings':
        {
          responseHasSettings(message.body.ok);
          break;
        }
    }
  });

  // ---------------------
  // Requests to Extension
  // ---------------------

  function requestSendPix() {
    let loading = document.querySelector('#loading');
    loading.style.display = 'block';

    let btn = document.querySelector('#btnSend');
    btn.setAttribute('disabled', 'disabled');

    let form = document.querySelector('#formSend');
    let data = new FormData(form);

    let receiver = '';
    let amount = 0;

    for (let [key, value] of data) {
      receiver = key === 'receiver' ? value : receiver;
      amount = key === 'amount' ? value : amount;
    }

    vscode.postMessage({ type: 'requestPixSend', body: {
      amount: amount,
      receiver: receiver
    } });
  }

  function requestHasSettings() {
    vscode.postMessage({ type: 'requestHasSettings' });
  }

  // ------------------------
  // Responses from Extension
  // ------------------------

  /**
   * @param {boolean} ok
   */
   function responsePixSend(ok) {
    let loading = document.querySelector('#loading');
    loading.style.display = 'none';

    let btn = document.querySelector('#btnSend');
    btn.removeAttribute('disabled');

    if (!ok) {
      return;
    }

    let form = document.querySelector('#formSend');
    form.reset();
  }

  /**
   * @param {boolean} ok
   */
 function responseHasSettings(ok) {
  let containerDashboard = document.querySelector('#containerDashboard');
  let containerSettingsStatus = document.querySelector('#containerSettingsStatus');

  if (ok) {
    containerDashboard.style.display = 'block';
    containerSettingsStatus.style.display = 'none';
    return;
  }
  containerDashboard.style.display = 'none';
  containerSettingsStatus.style.display = 'block';
}


}());
