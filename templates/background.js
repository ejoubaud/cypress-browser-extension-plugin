/* global chrome */
// This file is a template, not a module
// It will be added to the extension while the tests run, to let Cypress pass commands
// to the background tab and access the browser/chrome object and the local storage
// It MAY contain an {{alias}} placeholder, to link it to a specific extension
// It MAY include JS require statements, as it's then bundled with Browserify
const common = require('../lib/common');

const { responseType, commandType } = common.constants;
const log = common.logger({ prefix: 'Cypress ext bg' });

function getProperty(chrome, property) {
  if (!property || property.trim() === '') return chrome;
  const propertyPath = property.split('.');
  return propertyPath.reduce((position, nextStep) => position[nextStep], chrome);
}

function logPromiseResult(promise) {
  promise.then(
    res => log('Command success', res) || res,
    err => log('Command error', err) || err,
  );
}

function addPromisifiedCb(args, resolve, reject) {
  return (args || []).concat(val => (
    (chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(val))
  ));
}

// calls method on (given property of) the browser API object and returns a promise
// since it can't know in advance if the method has a sync return, a promise or a callback,
// this relies on the message.returnType passed by the caller (set to 'callback' if cb)
function executeBrowserCommand(message) {
  const { debug, property, method, returnType, args } = message;
  if (debug) log(`Calling command ${property}.${method}()`, message);
  const promise = new Promise((resolve, reject) => {
    const target = getProperty(chrome, property);
    if (!method) { // always sync if just accessing property (no method)
      resolve(target);
    } else if (returnType === 'callback') {
      target[method].apply(this, addPromisifiedCb(args, resolve, reject));
    } else { // returnType sync or promise
      try {
        const res = target[message].apply(this, args);
        if (res && typeof res.then === 'function') {
          res.then(resolve, reject);
        } else {
          resolve(res);
        }
      } catch (err) {
        reject(err);
      }
    }
  });
  if (debug) logPromiseResult(promise);
  return promise;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.cypressExtType === commandType) {
    const { responseId } = message;
    const cypressExtType = responseType;
    executeBrowserCommand(message).then(
      response => sendResponse({ responseId, cypressExtType, response }),
      error => sendResponse({ responseId, cypressExtType, error }),
    );
    // tells browser API the response to sendResponse will be async
    return true;
  }
  return false;
});
