chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "SEND_TO_ROLL20") return false;

  chrome.tabs.query({ url: "https://app.roll20.net/*" }, (tabs) => {
    const roll20Tab = tabs.find((tab) => tab.url && tab.url.includes("/editor/")) || tabs[0];
    if (!roll20Tab?.id) {
      sendResponse({
        ok: false,
        detail: "No open Roll20 game tab found."
      });
      return;
    }

    chrome.tabs.sendMessage(roll20Tab.id, {
      type: "ROLL20_CHAT_COMMAND",
      id: message.id,
      command: message.command
    }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          ok: false,
          detail: "Open or reload your Roll20 game tab so the bridge can attach."
        });
        return;
      }

      sendResponse(response || {
        ok: false,
        detail: "Roll20 tab did not confirm the command."
      });
    });
  });

  return true;
});
