import { newAtom } from "./particle";
import { isAtomAtomBond } from "./bonding";
import { vec, euler } from "./utils";

const CUBE_SIZE = 5;

it ('should not bond atoms that are far away', () => {
  const atom1 = newAtom(vec(-50, 0, 0), euler(0,0,0), vec(1, 0, 0));
  const atom2 = newAtom(vec(50, 0, 0), euler(0,0,0), vec(1, 0, 0));

  expect(isAtomAtomBond(atom1.object, atom2.object)).toBe(false);
});

it ('should not bond atoms that touch different colours', () => {
  const atom1 = newAtom(vec(-CUBE_SIZE/2, 0, 0), euler(0,0,0), vec(1, 0, 0));
  const atom2 = newAtom(vec(CUBE_SIZE/2, 0, 0), euler(0,0,0), vec(1, 0, 0));

  expect(isAtomAtomBond(atom1.object, atom2.object)).toBe(false);
});

it ('should bond atoms that touch same colours', () => {
  const atom1 = newAtom(vec(-CUBE_SIZE/2, 0, 0), euler(0,0,0), vec(1, 0, 0));
  const atom2 = newAtom(vec(CUBE_SIZE/2, 0, 0), euler(0,Math.PI,0), vec(1, 0, 0));

  expect(isAtomAtomBond(atom1.object, atom2.object)).toBe(true);
});
