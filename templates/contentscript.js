/* global window chrome */
// This file is a template, not a module
// It will be added to the extension while the tests run, to let Cypress pass commands
// to the background tab and access the browser/chrome object and the local storage
// It MAY contain an {{alias}} placeholder, to link it to a specific extension
// It MAY include JS require statements, as it's then bundled with Browserify
const log = require('../lib/common').logger({ prefix: 'Cypress ext contentscript' });

const targetWindow = window.top;

const logMethod = method => (method ? `.${method}()` : '');

targetWindow.addEventListener('message', function relayCommandsToBackground(event) {
  if (
    event.data &&
    event.data.cypressExtType &&
    event.data.alias === '{{alias}}'
  ) {
    const { debug, property, method, cypressExtType } = event.data;
    if (debug) log(`Relaying ${cypressExtType} to backend: ${property}${logMethod(method)}`, event.data);
    chrome.runtime.sendMessage(event.data, (rawResponse) => {
      if (typeof rawResponse === 'undefined') return; // sync calls, should we ever add any, don't warrant a callback to Cypress helpers
      if (debug) log(`Relaying ${rawResponse.error ? 'Error' : 'Success'} ${cypressExtType} ${property}${logMethod(method)} response`, rawResponse, 'to', event.data);
      targetWindow.postMessage(rawResponse, '*');
    });
  }
});
