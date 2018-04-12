# Test a Web extension with Cypress

This Cypress plugin provides a few helpers to help you test your browser extension without messing with its code just for testing.

## Installation

```
npm install --save-dev cypress-browser-extension-preprocessor
```

## Usage

In your project's [plugins file](https://on.cypress.io/guides/guides/plugins.html):

```javascript
const loadExtension = require('cypress-browser-extension-preprocessor')

module.exports = (on) => {
  on('before:browser:launch', loadExtension('/path/to/your/extension'))
}

// or with more config

module.exports = (on) => {
  on('before:browser:launch', loadExtension(options))
}
```

## Why?

There are a few limitations to browser extensions that make them hard to test in Cypress:

1. You can't (readily) access the extension's local storage to reset it (or apply fixtures) between tests.
2. Cypress has 3 frames, only one of which is for the app under test. To test a content script, you want it to run only in that frame.
3. The workarounds for the above imply to modify your extension's code just for testing, in a way that can leave it vulnerable to attacks.
4. Content scripts' ["isolated world" execution environment](https://developer.chrome.com/extensions/content_scripts#execution-environment) doesn't let you access `window.Cypress` or communicate with Cypress except via `window.postMessage(m, "*")`.

## How?

This plugin solves those problems by creating a test copy of your extension into a temporary file, into which it modifies the manifest to:

- inject a content and background script to let Cypress access the local storage in the background tab by relaying messages.
- override your content scripts `all_frames` and `matches` confs in the manifest so your extension will load in the Cypress iframe for the page under test, and only there.

Then it's that modified extension that you load into the browser opened by Cypress.
