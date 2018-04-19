/* globals chrome */
console.log('Loaded unpacked2 fixture extension background script');
chrome.runtime.onStartup.addListener(() => {
  chrome.runtime.local.storage.set({ content: true });
});
