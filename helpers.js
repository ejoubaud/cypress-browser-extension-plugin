const nanoid = require('nanoid');

const source = 'CypressBrowserExtensionHelpers';
const responseSource = 'CypressBrowserExtensionBackgroundResponse';
const targetWindow = window.top;

const merge = (...objs) => Object.assign({}, ...objs);
const listeners = [];

function log(txt, ...rest) { console.log(`%cCypress ext helpers %c${txt}`, 'color: gray; font-weight: lighter;', 'font-weight: bolder;', ...rest); }

// event listener can't reply to window.postMessage, but it can make a window.postMessage
// in return that we can listen to, with a response unique id to identify what it's replying to
function listenForResponse(message, timeout) {
  return new Promise((resolve, reject) => {
    const responseListener = function responseListener(event) {
      const { data } = event;
      if (data && data.responseId === message.responseId && data.source === responseSource) {
        if (message.debug) log(`Got ${message.property}.${message.method}() response`, data, 'in response to:', message);
        targetWindow.removeEventListener('message', responseListener);
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.response);
        }
      }
    };
    targetWindow.addEventListener('message', responseListener);
    setTimeout(() => {
      targetWindow.removeEventListener('message', responseListener);
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
    cypressExtType: 'BrowserCommand',
    responseId,
    source,
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

// alias is used to identify the extension if there are several
// property identifies the browser object (chrome) property on which to add a listener
// e.g. "runtime.onMessage" => browser.runtime.onMessage.addListener
// name is used to identity the specific listener if there are several on the property
function addBrowserListener({ alias, debug }, property, name, listener) {
  const listenerId = nanoid(); // Unique ID for later listener storage/retrieval in the background
  if (debug) log(`Adding ${property} listener ${listenerId}`, alias, listener);
  targetWindow.postMessage({
    cypressExtType: 'BrowserSubscription',
    listenerId,
    source,
    alias,
    property,
    debug,
  }, '*');
  const windowListener = function listenToSubscribedBrowserEvents(event) {
    if (event.data && event.data.listenerId === listenerId) {
      listener(event.data.payload);
    }
  };
  listeners.push({
    userListener: listener,
    windowListener,
    listenerId,
    property,
    alias,
  });
  targetWindow.addEventListener('message', windowListener);
}

// see addBrowserListener
function removeBrowserListener({ alias, debug }, property, listener) {
  // 3 "keys" so using a Map would be more trouble than worth. unlikely to add many listeners anyway
  const index = listeners.findIndex(bundle => (
    bundle.userListener === listener && bundle.property === property && bundle.alias === alias
  ));
  const { listenerId, windowListener } = listeners[index];
  if (debug) console.log(`Removing ${property} listener ${listenerId}:`, alias, listener);
  targetWindow.removeEventListener('message', windowListener);
  targetWindow.postMessage({
    cypressExtType: 'BrowserUnsubscription',
    listenerId,
    source,
    alias,
    debug,
    property,
  }, '*');
  listeners.splice(index);
}

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
      return sendBrowserCommand(merge(ctx, opts), `storage.${type}`, 'clear');
    },
    setStorage(type, obj, opts = {}) {
      return sendBrowserCommand(merge(ctx, opts), `storage.${type}`, 'set', [obj]);
    },
    getStorage(type, keys, opts = {}) {
      return sendBrowserCommand(merge(ctx, opts), `storage.${type}`, 'get', [keys]);
    },
    execCommand(property, method, args, opts = {}) {
      return sendBrowserCommand(merge(ctx, opts), property, method, args);
    },
    addListener(property, listener, opts = {}) {
      addBrowserListener(merge(ctx, opts), property, listener);
    },
    removeListener(property, listener, opts = {}) {
      removeBrowserListener(merge(ctx, opts), property, listener);
    },
  };
};
