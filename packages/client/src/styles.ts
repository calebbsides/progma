export const CSS = `
  #progma-root * { box-sizing: border-box; font-family: system-ui, sans-serif; }

  #progma-toggle {
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
  #progma-toggle:hover { background: #3f3f46; }
  #progma-toggle.active { background: #6366f1; }

  #progma-panel {
    position: fixed;
    bottom: 84px;
    right: 24px;
    z-index: 99998;
    width: 360px;
    max-height: 520px;
    background: #18181b;
    border: 1px solid #3f3f46;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  #progma-panel.hidden { display: none; }

  #progma-panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid #3f3f46;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #progma-panel-header span {
    font-size: 13px;
    font-weight: 600;
    color: #a1a1aa;
    flex: 1;
  }
  #progma-annotate-btn {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #52525b;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
  }
  #progma-annotate-btn.active {
    background: #6366f1;
    border-color: #6366f1;
    color: #fff;
  }

  #progma-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .progma-msg {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
    max-width: 90%;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .progma-msg.user {
    background: #6366f1;
    color: #fff;
    align-self: flex-end;
  }
  .progma-msg.ai {
    background: #27272a;
    color: #e4e4e7;
    align-self: flex-start;
  }
  .progma-msg.system {
    background: #1c1c1f;
    color: #71717a;
    align-self: flex-start;
    text-align: left;
    font-size: 11px;
    max-width: 90%;
  }

  #progma-input-row {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #3f3f46;
  }
  #progma-input {
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
  #progma-input:focus { border-color: #6366f1; }
  #progma-send {
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0 14px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
  }
  #progma-send:disabled { opacity: 0.5; cursor: not-allowed; }

  .progma-highlight {
    outline: 2px solid #6366f1 !important;
    outline-offset: 2px !important;
    cursor: crosshair !important;
  }

  .progma-pin {
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

  #progma-annotation-modal {
    position: fixed;
    inset: 0;
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.5);
  }
  #progma-annotation-modal.hidden { display: none; }
  #progma-annotation-box {
    background: #18181b;
    border: 1px solid #3f3f46;
    border-radius: 12px;
    padding: 20px;
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  #progma-annotation-box h3 {
    margin: 0;
    font-size: 14px;
    color: #e4e4e7;
  }
  #progma-annotation-text {
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    color: #e4e4e7;
    font-size: 13px;
    padding: 8px 12px;
    resize: vertical;
    height: 80px;
    outline: none;
  }
  #progma-annotation-text:focus { border-color: #6366f1; }
  #progma-annotation-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .progma-btn-secondary {
    background: transparent;
    border: 1px solid #52525b;
    color: #a1a1aa;
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
  }
  .progma-btn-primary {
    background: #6366f1;
    border: none;
    color: #fff;
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
  }
`
