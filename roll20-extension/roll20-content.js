chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "ROLL20_CHAT_COMMAND") return false;

  const result = sendChatCommand(message.command);
  sendResponse(result);
  return false;
});

function sendChatCommand(command) {
  const textarea = document.querySelector("#textchat-input textarea");
  if (!textarea) {
    return {
      ok: false,
      detail: "Roll20 chat input was not found. Make sure the game chat is open."
    };
  }

  textarea.focus();
  textarea.value = command;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  textarea.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  }));

  return {
    ok: true,
    detail: "Sent command to the open Roll20 tab."
  };
}
