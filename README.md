# Test a Web extension with Cypress [![CircleCI](https://circleci.com/gh/ejoubaud/cypress-browser-extension-plugin.svg?style=svg)](https://circleci.com/gh/ejoubaud/cypress-browser-extension-plugin)

This Cypress plugin provides a few helpers to help you test your browser extension without messing with its code just for testing.

## Installation

```
npm install --save-dev cypress-browser-extension-plugin
```

## Regular Usage

In your project's [plugins file](https://on.cypress.io/guides/guides/plugins.html):

```javascript
const loadExtension = require('cypress-browser-extension-plugin/loader');

module.exports = (on) => {
  on('before:browser:launch', loadExtension('/path/to/your/extension'));
}
```

Then in your spec/support files:

```javascript
const createHelpers = require('cypress-browser-extension-plugin/helpers');
const myExtension = createHelpers();

beforeEach(function() {
  cy.wrap(myExtension.clearStorage('local')); // Sync version, Cypress waits on your command
});
```

That's all you need to load a single extension and reset its storage on each test. Read further for more.

### Barebone usage (skip hooks)

Use this if you don't need Cypress to send commands to your Browser API (reset local storage, etc.):

```javascript
const loadExtension = require('cypress-browser-extension-plugin/loader');

on('before:browser:launch', loadExtension({
  source: '/path/to/myext',
  skipHooks: true,
}));
```

### Advanced usage:

You can pass options to the loader (here with their default value, unless required or stated otherwise):

```javascript
// or with more config
on('before:browser:launch', loadExtension({
  source: '/path/to/extension', // dir to the unpacked source extension, required
  alias: 'myExtension',         // identifier for use in tests if multiple extensions
  skipHooks: false              // don't inject content/background hook scripts, more secure and less intrusive but you can't use helpers/commands, set it to true if you don't need them
  watch: true,                  // rebuilds the temp dir extension on source files changes, useful on exts implementing live reload
  validBrowser: ['chrome'],     // valid browser names to load the extension to, null for all
  quiet: false,                 // disables loader console logs when set to true
  destDir: '/tmp/dir/my/ext'    // where your ext will be copied, modified and loaded into Chrome, defaults to ${os.tmpdir()}/${alias}
  cypressMatches: ['*://*/*/integration/*'] // identifies Cypress frames by URL to prevent your extension loading in those, set it if your test dir is not cypress/integration/, must be an array
}))
```

You can also define several extensions, in which case you'll need to give them an alias to tell which one should receive each command in the helpers:

```javascript
const loadExtensions = require('cypress-browser-extension-plugin');
on('before:browser:launch', function(browser = {}, args) (
  return loadExtensions(
    '/path/to/ext1', // alias defaults to myExtension
    // all exts need their own alias (at most one can have the default alias)
    { source: '/path/to/ext2', alias: 'ext2' }, 
    { source: '/path/to/ext3', alias: 'ext3' },
  )(browser, args);
));
```

A few convenience helpers are provided for storage management. For most purposes, you should only ever need to use the first two. They all return a promise:

```javascript
const myExt = require('cypress-browser-extension-plugin/helpers')(options); // options is optional

myExt.clearStorage(type);        // clear `type` storage ('local', 'sync' or 'managed')
myExt.setStorage(type, obj);     // => chrome.storage[type].set(obj)
myExt.getStorage(type, [k1,k2]); // => chrome.storage[type].get([k1,k2])
```

If you really(?) need more, the `execCommand` helper gives you access to the wider browser extension API, with a few caveats:

1. you can only pass JSONifiable args, no function (because they'll go through `window.postMessage` and `runtime.sendMessage`), so event listeners are not supported
2. your args must be passed as a `[arg1, arg2, ...]` array, single args as `[arg]` (don't forget the wrapping array)
3. it always returns a promise, that will resolve to the result of the method/property called, assuming it's JSONifiable
4. if you're calling a synchronous API method, you need to let the plugin know with the `{returnType: 'sync'}` option (by default, the plugin assumes the methods you're calling on the browser API are async and callback-based ; it passes them  callback, from which it generates a promise ; that can cause errors or the response to get lost if the method actually expects sync arguments and no callback)

```javascript
// generic helper: `.execCommand(property, method, args, options)`
myExt.execCommand('runtime', 'sendMessage', [msg]) // => `chrome.runtime.sendMessage(message)`
  .then((response) => doSomething(response));      // always returns a promise (JSONifiable response only), whether sync or async
myExt.execCommand('storage.local', 'set', [obj]);  // properties can be chained with a dotted name
myExt.execCommand('tabs.TAB_ID_NONE').then((idNone) => /*.*/);  // accessing a property, we don't pass a method or args arg => `chrome.tabs.TAB_ID_NONE`
```

You can customize the helpers context config:

```javascript
const myOtherExtension = require('cypress-browser-extension-plugin/helpers')({
  alias: 'myOtherExtension', // if you've loaded 2+ extensions in the loader w/ aliases, default 'myExtension'
  debug: true,               // spam the JS console with debug messages to debug issues, default false
  timeout: 5000,             // ms waiting for commands to extension backend to reply, default 2000
})
```

Context options can be overriden per command:

```javascript
myExt.execCommand('runtime', 'postMessage', [msg], {
  alias: 'myOtherExtension',  // send command to another extension
  debug: true,                // log stuff to console
  timeout: 5000,              // change timeout
  returnType: 'sync'          // tell the backend to expect a sync response from the method, rather than pass it a callback (default 'callback')
}).then(/*.*/);
```

## Why?

There are a few limitations to browser extensions that make them hard to test in Cypress:

1. You can't (readily) access the extension's local storage to reset it (or apply fixtures) between tests. Or the browser extension API in general.
2. Cypress has 3 frames, only one of which is for the app under test. To test a content script, you want it to run only in that frame.
3. The workarounds for the above imply to modify your extension's code just for testing, in a way that can leave it vulnerable to attacks (`window.postMessages(m, "*")`).

## How?

This plugin works around those problems by creating a test copy of your extension into a temporary dir, into which it modifies the manifest to:

1. override your content scripts `all_frames` and `matches` confs so your extension will load in the Cypress iframe for the page under test, and only there
2. inject a content and background script to let Cypress reach the browser extension API in the background tab by relaying messages with `window.postMessage` and `chrome.runtime.sendMessage` (disable this with the `skipHooks` option)

Then it's that modified extension that gets loaded into the browser opened by Cypress.

## Security

TL;DR Only use this on tests that visit trusted webpages. Don't store sensitive data in your Browser's test profile/env. And you'll be fine.

Long version: If your Cypress tests visit an untrusted page, that page can possibly craft a `window.postMessage` request to exploit this plugin's hooks and gain access to your extension's backend API in the same way Cypress does. Effectively, the potential impact is the same as installing an untrusted extension on your test browser with all the same permissions your extension under test has.

(It's quite low-risk low-impact really. Why would a page bother to add specifically-crafted `postMessage`s to its JS to access the worthless test data of an unlikely Cypress-extension-testing visitor on a test browser profile? Is it a big deal if they access your test data or mess with your test browser profile? Then tiny as the risk may be, you should take it knowingly)

Overall, this plugin saves you from having to add those unsafe hooks in your extension's production code, so used responsibly it should be a security net positive.

NB: Those concerns don't apply if you use the [`skipHook` option](#barebone-usage-skip-hooks).

## TODO

- Add Cypress custom commands
- Handle `.crx`/packaged extensions
- Cross-browser compatibility (so far built for Chrome, like Cypress, should work OOTB with FF when supported by Cypress but untested so far)
- Use browserify/webpack for templates so we can require stuff while still replacing `{{alias}}` placeholders and DRY-up functions/constants
- Add secure messaging (encryption+nonce+loader generates pwd shared w/ helpers via Cypress config/env?) so visited pages can't exploit `window.postMessage` listeners to abuse your background API (low-priority, see [Security](#security))
