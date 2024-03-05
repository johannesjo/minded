// console.log("background loaded");
// chrome.tabs.create({
//   url: chrome.runtime.getURL("src/pages/popup/index.html"),
// });
//

chrome.action.onClicked.addListener(function (tab) {
  chrome.tabs.create({
    url: chrome.runtime.getURL("src/pages/newtab/index.html"),
  });
});
