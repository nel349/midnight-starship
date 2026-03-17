// Keyboard input handler — tracks pressed keys

export type InputState = {
  left: boolean;
  right: boolean;
  fire: boolean;
  enter: boolean;
  escape: boolean;
};

const keys: Set<string> = new Set();
let firePressed = false;
let enterPressed = false;

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    keys.add(e.key);

    // Prevent scrolling on arrow keys / space
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.key);
    if (e.key === ' ' || e.key === 'ArrowUp') firePressed = false;
    if (e.key === 'Enter') enterPressed = false;
  });
}

export function getInput(): InputState {
  const fire = !firePressed && (keys.has(' ') || keys.has('ArrowUp'));
  const enter = !enterPressed && keys.has('Enter');

  if (fire) firePressed = true;
  if (enter) enterPressed = true;

  return {
    left: keys.has('ArrowLeft') || keys.has('a'),
    right: keys.has('ArrowRight') || keys.has('d'),
    fire,
    enter,
    escape: keys.has('Escape'),
  };
}
