const nanoid = require('nanoid');
const { deserializeError } = require('serialize-error');

const common = require('./lib/common');

const { responseType, commandType } = common.constants;
const log = common.logger({ prefix: 'Cypress ext helpers' });

const targetWindow = window.top;

const merge = (...objs) => Object.assign({}, ...objs);

// event listener can't reply to window.postMessage, but it can make a window.postMessage
// in return that we can listen to, with a response unique id to identify what it's replying to
function listenForResponse(message, timeout) {
  return new Promise((resolve, reject) => {
    const windowListener = function responseListener(event) {
      const { data } = event;
      if (data && data.cypressExtType === responseType && data.responseId === message.responseId) {
        if (message.debug) log(`Got ${message.property}.${message.method}() response`, data, 'in response to:', message);
        targetWindow.removeEventListener('message', windowListener);
        if (data.error) {
          reject(deserializeError(data.error));
        } else {
          resolve(data.response);
        }
      }
    };
    targetWindow.addEventListener('message', windowListener);
    setTimeout(() => {
      targetWindow.removeEventListener('message', windowListener);
      reject(new Error(`Timeout after ${timeout}ms waiting for response to command ${message.property}.${message.method}`));
    }, timeout);
  });
}

// alias is used to identify the extension if there are several
// returnType can be sync, promise or callback (default), after the browser API's method
// property identifies the browser object (chrome) property on which to call a method,
// method identifies the method to be called on the property
// args is the arguments to pass to the method (must be JSONifiable, no function)
// e.g. {property: "storage.local", method: "get", args: [k1, k2]}
// => chrome.storage.local.get(k1, k2)
function sendBrowserCommand({ alias, timeout, debug, returnType }, property, method, args) {
  const responseId = nanoid(); // Unique ID to identify response
  const message = {
    cypressExtType: commandType,
    responseId,
    alias,
    debug,
    returnType,
    property,
    method,
    args,
  };
  const promise = listenForResponse(message, timeout);
  if (debug) log(`Sending ${message.property}.${message.method}() command`, message);
  targetWindow.postMessage(message, '*');
  return promise;
}

function assertPresent(type) { if (typeof type !== 'string') throw new Error('Need to specify extension storage type (local, sync or managed)'); }
function assertArray(args) { if (typeof args !== 'undefined' && !Array.isArray(args)) throw new Error('execCommand arg should be passed as an array of args, even on single value'); }

const defaultContext = {
  alias: 'myExtension',
  debug: false,
  timeout: 2000,
  returnType: 'callback', // sync, promise or callback
};

module.exports = function createHelpers(userContext = {}) {
  const ctx = merge(defaultContext, userContext);
  return {
    clearStorage(type, opts = {}) { // type is basically sync or local
      assertPresent(type);
      return sendBrowserCommand(merge(ctx, opts), `storage.${type}`, 'clear');
    },
    setStorage(type, obj, opts = {}) {
      assertPresent(type);
      return sendBrowserCommand(merge(ctx, opts), `storage.${type}`, 'set', [obj]);
    },
    getStorage(type, keys, opts = {}) {
      assertPresent(type);
      return sendBrowserCommand(merge(ctx, opts), `storage.${type}`, 'get', [keys]);
    },
    execCommand(property, method, args, opts = {}) {
      assertArray(args);
      return sendBrowserCommand(merge(ctx, opts), property, method, args);
    },
  };
};
