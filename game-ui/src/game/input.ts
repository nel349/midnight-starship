// Keyboard input handler — tracks pressed keys and text entry

export type InputState = {
  left: boolean;
  right: boolean;
  fire: boolean;
  enter: boolean;
  escape: boolean;
  prove: boolean;
  backspace: boolean;
};

const keys: Set<string> = new Set();
let firePressed = false;
let enterPressed = false;
let provePressed = false;

// Text input buffer for alias entry
let textBuffer = '';
let textInputActive = false;

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    keys.add(e.key);

    // Prevent scrolling on arrow keys / space
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
    }

    // Text input mode — capture printable characters
    if (textInputActive) {
      if (e.key === 'Backspace') {
        textBuffer = textBuffer.slice(0, -1);
      } else if (e.key.length === 1 && textBuffer.length < 12) {
        textBuffer += e.key.toUpperCase();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.key);
    if (e.key === ' ' || e.key === 'ArrowUp') firePressed = false;
    if (e.key === 'Enter') enterPressed = false;
    if (e.key === 'p' || e.key === 'P') provePressed = false;
  });
}

export function getInput(): InputState {
  const fire = !firePressed && (keys.has(' ') || keys.has('ArrowUp'));
  const enter = !enterPressed && keys.has('Enter');
  const prove = !provePressed && (keys.has('p') || keys.has('P'));

  if (fire) firePressed = true;
  if (enter) enterPressed = true;
  if (prove) provePressed = true;

  return {
    left: keys.has('ArrowLeft') || keys.has('a'),
    right: keys.has('ArrowRight') || keys.has('d'),
    fire,
    enter,
    escape: keys.has('Escape'),
    prove,
    backspace: keys.has('Backspace'),
  };
}

export function startTextInput(initial: string = ''): void {
  textBuffer = initial;
  textInputActive = true;
}

export function stopTextInput(): string {
  textInputActive = false;
  return textBuffer;
}

export function getTextBuffer(): string {
  return textBuffer;
}

export function isTextInputActive(): boolean {
  return textInputActive;
}
