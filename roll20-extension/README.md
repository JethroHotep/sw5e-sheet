# SW5e Roll20 Bridge Extension

This optional unpacked browser extension relays chat commands from the local SW5e sheet app to an open Roll20 game tab in the same browser profile.

## Install In Edge Or Chrome

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable developer mode.
3. Choose `Load unpacked`.
4. Select this folder: `roll20-extension`.
5. Open or reload your Roll20 game tab.
6. Open the local sheet at `http://127.0.0.1:8765/index.html`.

When `Auto-send to Roll20 bridge` is enabled, clicking a roll still copies the command to the clipboard and also asks the extension to post it to Roll20 chat.

## Notes

- The extension does not read Roll20 character data.
- It only sends the generated chat command text.
- If Roll20 changes its chat input markup, `roll20-content.js` may need a selector update.
