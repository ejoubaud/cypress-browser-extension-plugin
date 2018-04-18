/* global window chrome */
// This file is a template, not a module.
// It will be added to the extension while the tests run, to let Cypress pass commands
// to the background tab and access the browser/chrome object and the local storage
// It MUST be standalone (no require/import will work, this is simple copy, not Webpack)
// It MAY contain an {{alias}} placeholder, to link it to a specific extension
const targetWindow = window.top;


// Duplicated log function since we can't (yet) use require in templates
function log(txt, ...rest) { console.log(`%cCypress ext contentscript %c${txt}`, 'color: gray; font-weight: lighter;', 'font-weight: bolder;', ...rest); }
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
