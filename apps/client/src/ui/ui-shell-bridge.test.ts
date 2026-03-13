import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { describe, it } from 'vitest';
import { UiShellBridge } from './ui-shell-bridge.ts';

describe('UiShellBridge', () => {
  it('renders an inline recovery panel with structured diagnostics and invokes retry actions', async () => {
    const dom = new JSDOM('<div id="app"></div>');
    const root = dom.window.document.querySelector<HTMLElement>('#app');
    assert.ok(root);

    const bridge = new UiShellBridge(root);
    let retryCalls = 0;

    bridge.showError({
      diagnostics: {
        code: 'ROOM_CONNECT_FAILED',
        phase: 'connect',
        message: 'We could not finish joining the room',
        detail: 'Retry and the client will try the room join again.',
        retryable: true,
        roomIdHint: 'town:base:1'
      },
      recovery: {
        label: 'Retry connection',
        run() {
          retryCalls += 1;
        }
      }
    });

    const panel = root.querySelector<HTMLElement>('[data-ui-shell="recovery-panel"]');
    assert.ok(panel);
    assert.match(panel.textContent ?? '', /could not finish joining the room/i);
    assert.match(panel.textContent ?? '', /try the room join again/i);
    assert.match(panel.textContent ?? '', /browser console/i);
    assert.doesNotMatch(panel.textContent ?? '', /ROOM_CONNECT_FAILED/);
    assert.doesNotMatch(panel.textContent ?? '', /town:base:1/);
    assert.equal(root.dataset.client, 'error');
    assert.equal(root.dataset.error, 'We could not finish joining the room');

    const button = root.querySelector<HTMLButtonElement>('[data-ui-shell="retry-button"]');
    assert.ok(button);
    button.click();
    assert.equal(retryCalls, 1);

    bridge.showBooting();

    assert.equal(root.querySelector('[data-ui-shell="recovery-panel"]'), null);
  });
});
