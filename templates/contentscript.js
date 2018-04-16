/* global window chrome */
// This file is a template, not a module.
// It will be added to the extension while the tests run, to let Cypress pass commands
// to the background tab and access the browser/chrome object and the local storage
// It MUST be standalone (no require/import will work, this is simple copy, not Webpack)
// It MAY contain an {{alias}} placeholder, to link it to a specific extension
const responseSource = 'CypressBrowserExtensionBackgroundResponse';
const targetWindow = window.top;

// Duplicated log function since we can't (yet) use require in templates
function log(txt, ...rest) { console.log(`%cCypress ext contentscript %c${txt}`, 'color: gray; font-weight: lighter;', 'font-weight: bolder;', ...rest); }

targetWindow.addEventListener('message', function relayCommandsToBackground(event) {
  if (
    event.data &&
    event.data.source === 'CypressBrowserExtensionHelpers' &&
    event.data.alias === '{{alias}}'
  ) {
    const { responseId, debug, property, method, cypressExtType } = event.data;
    if (debug) log(`Relaying ${cypressExtType} to backend: ${property}:${method}()`, event.data);
    chrome.runtime.sendMessage(event.data, (response) => {
      const error = chrome.runtime.lastError;
      const source = responseSource;
      if (error) {
        if (debug) log(`Relaying Error ${cypressExtType} response: ${property}.${method}()`, event.data, 'Error:', error);
        targetWindow.postMessage({ responseId, source, error }, '*');
      } else {
        if (debug) log(`Relaying Success ${cypressExtType} response: ${property}.${method}()`, event.data, 'Response:', response);
        targetWindow.postMessage({ responseId, source, response }, '*');
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function relayBrowserEventsToListener(message) {
  if (message.source === 'CypressBrowserExtensionBackgroundListener') {
    if (message.debug) log(`Relaying listener Event ${message.property}`, message);
    targetWindow.postMessage(message, '*');
  }
});
