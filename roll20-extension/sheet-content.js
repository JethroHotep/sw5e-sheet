(() => {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.source !== "sw5e-sheet" || message.type !== "ROLL20_COMMAND") return;

    chrome.runtime.sendMessage({
      type: "SEND_TO_ROLL20",
      id: message.id,
      command: message.command
    }, (response) => {
      window.postMessage({
        source: "sw5e-roll20-bridge",
        id: message.id,
        ok: Boolean(response?.ok),
        detail: response?.detail || "Roll20 bridge did not respond."
      }, window.location.origin);
    });
  });
})();
