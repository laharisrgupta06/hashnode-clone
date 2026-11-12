// Where each key cap sits in the typewriter image (assets/typewriter/typewriter-body.webp, 1536 x 1024),
// measured from the image itself, and which typed characters press it.
export const BODY_SIZE = { width: 1536, height: 1024 };
export const CAP = { rx: 37, ry: 25 };

const row = (y, entries) => entries.map(([id, x, chars]) => ({ id, x, y, chars }));

export const KEYS = [
  ...row(536, [
    ['1', 288, '1!'],
    ['2', 384, '2@'],
    ['3', 472, '3#'],
    ['4', 557, '4$'],
    ['5', 647, '5%'],
    ['6', 732, '6^'],
    ['7', 818, '7&'],
    ['8', 909, '8*'],
    ['9', 991, '9('],
    ['0', 1079, '0)'],
    ['minus', 1163, '-_'],
    ['plus', 1252, '=+'],
  ]),
  ...row(616, [
    ['q', 326, 'q'],
    ['w', 413, 'w'],
    ['e', 501, 'e'],
    ['r', 591, 'r'],
    ['t', 678, 't'],
    ['y', 766, 'y'],
    ['u', 856, 'u'],
    ['i', 945, 'i'],
    ['o', 1036, 'o'],
    ['p', 1123, 'p'],
    ['half', 1219, '[]{}|\\'],
  ]),
  ...row(683, [
    ['a', 349, 'a'],
    ['s', 438, 's'],
    ['d', 528, 'd'],
    ['f', 617, 'f'],
    ['g', 707, 'g'],
    ['h', 795, 'h'],
    ['j', 886, 'j'],
    ['k', 976, 'k'],
    ['l', 1066, 'l'],
    ['colon', 1158, ';:'],
    ['quote', 1277, '\'"`~'],
  ]),
  ...row(756, [
    ['z', 394, 'z'],
    ['x', 490, 'x'],
    ['c', 578, 'c'],
    ['v', 666, 'v'],
    ['b', 757, 'b'],
    ['n', 847, 'n'],
    ['m', 937, 'm'],
    ['comma', 1029, ',<'],
    ['period', 1123, '.>'],
    ['slash', 1225, '/?'],
  ]),
  // the two large keys on the left: shift lock and shift
  { id: 'lock', x: 248, y: 676, chars: '', rx: 40, ry: 24 },
  { id: 'shift', x: 273, y: 756, chars: '', rx: 50, ry: 28 },
];

export const SPACE = { id: 'space', x0: 317, x1: 1229, y0: 812, y1: 880 };
// The maker's nameplate in the image, covered with a DevPress plate.
export const NAMEPLATE = { x0: 655, y0: 430, x1: 885, y1: 484 };

const BY_CHAR = new Map();
for (const key of KEYS) for (const ch of key.chars) BY_CHAR.set(ch, key.id);

const LETTERS = KEYS.filter((k) => /^[a-z]$/.test(k.id)).map((k) => k.id);

// Which key a keyboard event presses on the typewriter (null when none should move).
export function keyForEvent(event) {
  const { key } = event;
  if (key === ' ') return 'space';
  if (key === 'Shift' || key === 'CapsLock') return key === 'Shift' ? 'shift' : 'lock';
  if (key === 'Backspace' || key === 'Tab') return 'lock';
  if (key.length !== 1) return null;
  const lower = key.toLowerCase();
  if (BY_CHAR.has(lower)) return BY_CHAR.get(lower);
  // a character this old machine has no key for (accents, symbols): one of the letter keys moves
  return LETTERS[key.codePointAt(0) % LETTERS.length];
}
