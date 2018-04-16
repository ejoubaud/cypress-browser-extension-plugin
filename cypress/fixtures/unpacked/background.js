/* globals chrome */
chrome.runtime.onStartup.addListener(() => {
  chrome.runtime.local.storage.set({ content: true });
});
