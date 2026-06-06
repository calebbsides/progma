export const CSS = `
  #protozoan-root * { box-sizing: border-box; font-family: system-ui, sans-serif; }

  /* FAB */
  #protozoan-toggle {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #18181b;
    color: #fff;
    border: none;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    transition: background 0.15s;
  }
  #protozoan-toggle:hover { background: #3f3f46; }
  #protozoan-toggle.active { background: #6366f1; }

  /* Full-screen opaque overlay — pointer-events: none so mouse events reach page elements */
  #protozoan-overlay {
    position: fixed;
    inset: 0;
    z-index: 99998;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  #protozoan-overlay.hidden { display: none; }

  /* Modal panel — re-enable pointer events; position driven by JS on element click */
  #protozoan-modal {
    position: fixed;
    left: -9999px;
    top: -9999px;
    width: 380px;
    max-height: calc(100vh - 24px);
    background: #18181b;
    border: 1px solid #3f3f46;
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    pointer-events: auto;
  }

  /* Chat pane — hidden until an element is selected */
  #protozoan-chat {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  #protozoan-chat.hidden { display: none; }

  /* Header */
  #protozoan-modal-header {
    padding: 14px 16px;
    border-bottom: 1px solid #3f3f46;
    display: flex;
    align-items: center;
  }
  #protozoan-title {
    font-size: 13px;
    font-weight: 600;
    color: #a1a1aa;
    flex: 1;
  }
  #protozoan-close {
    background: transparent;
    border: none;
    color: #71717a;
    font-size: 14px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    line-height: 1;
  }
  #protozoan-close:hover { color: #e4e4e7; }

  /* Inspect bar */
  #protozoan-inspect-bar {
    padding: 10px 16px;
    border-bottom: 1px solid #3f3f46;
    min-height: 42px;
    display: flex;
    align-items: center;
  }
  #protozoan-inspect-hint {
    font-size: 12px;
    color: #71717a;
  }

  /* Selected element badge */
  #protozoan-selected-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1e1b4b;
    border: 1px solid #4338ca;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 12px;
    color: #a5b4fc;
    font-family: monospace;
    max-width: 100%;
    overflow: hidden;
  }
  #protozoan-selected-badge.hidden { display: none; }
  #protozoan-selected-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  #protozoan-deselect {
    background: transparent;
    border: none;
    color: #6366f1;
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
  }
  #protozoan-deselect:hover { color: #a5b4fc; }

  /* Messages */
  #protozoan-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 200px;
    max-height: 340px;
  }

  .protozoan-msg {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
    max-width: 90%;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .protozoan-msg.user {
    background: #6366f1;
    color: #fff;
    align-self: flex-end;
  }
  .protozoan-msg.ai {
    background: #27272a;
    color: #e4e4e7;
    align-self: flex-start;
  }
  .protozoan-msg.system {
    background: #1c1c1f;
    color: #71717a;
    align-self: flex-start;
    font-size: 11px;
    max-width: 90%;
  }

  /* Input row */
  #protozoan-input-row {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #3f3f46;
  }
  #protozoan-input {
    flex: 1;
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    color: #e4e4e7;
    font-size: 13px;
    padding: 8px 12px;
    resize: none;
    outline: none;
    height: 36px;
    line-height: 20px;
  }
  #protozoan-input:focus { border-color: #6366f1; }
  #protozoan-send {
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0 14px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }
  #protozoan-send:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Element hover highlight — visible through the overlay */
  .protozoan-hovered {
    outline: 2px solid #6366f1 !important;
    outline-offset: 2px !important;
    cursor: crosshair !important;
  }

  /* Selected element highlight */
  .protozoan-selected {
    outline: 2px solid #818cf8 !important;
    outline-offset: 2px !important;
    background-color: rgba(99, 102, 241, 0.08) !important;
  }

  /* Annotation pins */
  .protozoan-pin {
    position: fixed;
    width: 20px;
    height: 20px;
    background: #6366f1;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    z-index: 99990;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
`
