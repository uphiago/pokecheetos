import type { GuestBootstrapResponse } from '@pokecheetos/shared';
import type { RoomLike } from '../network/room-client.ts';
import type { ClientDiagnostics } from './client-diagnostics.ts';

type RootDatasetLike = {
  dataset: Record<string, string | undefined>;
};

type RecoveryHostLike = RootDatasetLike & {
  appendChild(node: Node): Node;
  ownerDocument: Document;
};

type RecoveryAction = {
  label: string;
  run(): void;
};

export type UiShellErrorState = {
  diagnostics: ClientDiagnostics;
  recovery?: RecoveryAction;
};

export type UiShellBridgeState = {
  status: 'idle' | 'booting' | 'ready' | 'error';
  guestId?: string;
  roomId?: string;
  error?: string;
  diagnostics?: ClientDiagnostics;
  recoveryLabel?: string;
};

export class UiShellBridge {
  readonly #root?: RootDatasetLike | RecoveryHostLike;
  #state: UiShellBridgeState = { status: 'idle' };
  #retryButton?: HTMLButtonElement;
  #recoveryPanel?: HTMLElement;
  #activeRecovery?: RecoveryAction;

  constructor(root?: RootDatasetLike | RecoveryHostLike) {
    this.#root = root;
  }

  showBooting(): void {
    this.#state = { status: 'booting' };
    this.#writeDataset();
    this.#hideRecoveryPanel();
  }

  showConnected<TRoom extends RoomLike>(input: { session: GuestBootstrapResponse; room: TRoom }): void {
    this.#state = {
      status: 'ready',
      guestId: input.session.guestId,
      roomId: input.room.roomId ?? input.session.roomIdHint
    };
    this.#writeDataset();
    this.#hideRecoveryPanel();
  }

  showError(input: UiShellErrorState): void {
    this.#state = {
      status: 'error',
      error: input.diagnostics.message,
      diagnostics: input.diagnostics,
      recoveryLabel: input.recovery?.label
    };
    this.#activeRecovery = input.recovery;
    this.#writeDataset();
    this.#showRecoveryPanel();
  }

  getState(): UiShellBridgeState {
    return { ...this.#state };
  }

  #writeDataset(): void {
    if (!this.#root) {
      return;
    }

    this.#root.dataset.client = this.#state.status;
    this.#root.dataset.guestId = this.#state.guestId;
    this.#root.dataset.roomId = this.#state.roomId;
    this.#root.dataset.error = this.#state.error;
  }

  #showRecoveryPanel(): void {
    const panel = this.#getRecoveryPanel();
    const diagnostics = this.#state.diagnostics;
    if (!panel || !diagnostics) {
      return;
    }

    panel.replaceChildren();

    const title = panel.ownerDocument.createElement('h2');
    title.textContent = 'Connection issue';
    panel.appendChild(title);

    const message = panel.ownerDocument.createElement('p');
    message.textContent = diagnostics.message;
    panel.appendChild(message);

    const detail = panel.ownerDocument.createElement('p');
    detail.textContent = diagnostics.detail;
    panel.appendChild(detail);

    const consoleHint = panel.ownerDocument.createElement('p');
    consoleHint.textContent = 'Open the browser console if you need the debug code.';
    panel.appendChild(consoleHint);

    if (this.#activeRecovery) {
      const retryButton = this.#getRetryButton(panel.ownerDocument);
      retryButton.textContent = this.#state.recoveryLabel ?? 'Retry connection';
      retryButton.onclick = () => {
        this.#activeRecovery?.run();
      };
      panel.appendChild(retryButton);
    }
  }

  #hideRecoveryPanel(): void {
    const panel = this.#recoveryPanel;
    if (!panel) {
      return;
    }

    panel.remove();
    this.#recoveryPanel = undefined;
    this.#retryButton = undefined;
    this.#activeRecovery = undefined;
  }

  #getRecoveryPanel(): HTMLElement | undefined {
    if (!isRecoveryHost(this.#root)) {
      return undefined;
    }

    if (!this.#recoveryPanel) {
      const panel = this.#root.ownerDocument.createElement('section');
      panel.dataset.uiShell = 'recovery-panel';
      this.#root.appendChild(panel);
      this.#recoveryPanel = panel;
    }

    return this.#recoveryPanel;
  }

  #getRetryButton(ownerDocument: Document): HTMLButtonElement {
    if (!this.#retryButton) {
      const button = ownerDocument.createElement('button');
      button.type = 'button';
      button.dataset.uiShell = 'retry-button';
      this.#retryButton = button;
    }

    return this.#retryButton;
  }
}

function isRecoveryHost(root: RootDatasetLike | RecoveryHostLike | undefined): root is RecoveryHostLike {
  return Boolean(
    root &&
      'appendChild' in root &&
      typeof root.appendChild === 'function' &&
      'ownerDocument' in root &&
      root.ownerDocument
  );
}
