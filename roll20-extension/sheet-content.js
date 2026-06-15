(() => {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.source !== "sw5e-sheet") return;

    if (message.type === "ROLL20_BRIDGE_PING") {
      window.postMessage({
        source: "sw5e-roll20-bridge",
        type: "ROLL20_BRIDGE_PONG",
        ok: true
      }, window.location.origin);
      return;
    }

    if (message.type !== "ROLL20_COMMAND") return;

    chrome.runtime.sendMessage({
      type: "SEND_TO_ROLL20",
      id: message.id,
      command: message.command
    }, (response) => {
      const error = chrome.runtime.lastError;
      window.postMessage({
        source: "sw5e-roll20-bridge",
        id: message.id,
        ok: !error && Boolean(response?.ok),
        detail: error?.message || response?.detail || "Roll20 bridge did not respond."
      }, window.location.origin);
    });
  });
})();
