/**
 * Lightweight toast notification system for content scripts.
 * Uses plain DOM (createElement/textContent) — no innerHTML, no React.
 */

type ToastType = 'info' | 'success' | 'error';

const CONTAINER_ID = 'repo2txt-toast-container';

/** Ensure a shared container exists and return it. */
function ensureContainer(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a non-blocking toast notification.
 *
 * @param message  - Text to display
 * @param type     - Visual variant: 'info' | 'success' | 'error' (default 'info')
 * @param duration - Auto-dismiss delay in ms (default 5000)
 */
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = 5000,
): void {
  const container = ensureContainer();

  const toast = document.createElement('div');
  toast.className = `repo2txt-toast repo2txt-toast-${type}`;

  const text = document.createElement('span');
  text.textContent = message;

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'repo2txt-toast-dismiss';
  dismissBtn.type = 'button';
  dismissBtn.setAttribute('aria-label', 'Dismiss');
  dismissBtn.textContent = '\u00D7'; // ×
  dismissBtn.addEventListener('click', () => removeToast(toast));

  toast.appendChild(text);
  toast.appendChild(dismissBtn);
  container.appendChild(toast);

  // Trigger fade-in on next frame
  requestAnimationFrame(() => {
    toast.classList.add('repo2txt-toast-visible');
  });

  // Auto-dismiss
  setTimeout(() => removeToast(toast), duration);
}

/** Fade-out and remove a toast element. */
function removeToast(toast: HTMLElement): void {
  if (!toast.parentNode) return; // already removed
  toast.classList.remove('repo2txt-toast-visible');
  toast.classList.add('repo2txt-toast-fade-out');
  toast.addEventListener('animationend', () => {
    toast.remove();
    // Clean up empty container
    const container = document.getElementById(CONTAINER_ID);
    if (container && container.childNodes.length === 0) {
      container.remove();
    }
  });
}
