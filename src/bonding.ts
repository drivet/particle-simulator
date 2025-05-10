import { Object3D, Plane, Vector3 } from 'three';
import { boundingBox, vec } from './utils';

/**
 * Functions that implement "bonding" checks, i.e. code to detect when two Object3D 
 * groups representing atoms or molecules should bond.
 * 
 */

const COLLINEAR_OPPOSITE_THRESHOLD = 0.93;
const PLANE_DISTANCE_THRESHOLD = 0.01;

/**
 * Should really only be called with atoms.
 * WARNING: This assumes that the atom box is 1 x 1 x 1 in local space, but 
 * I think this is a fairly good assumption.  We scale the result later.
 * 
 */
function isSidePlaneAligned(side: number, atom1: Object3D, atom2: Object3D): boolean {
  if (side < 0 || side > 5) {
    throw new Error("side must be between 0 and 5");
  }

  let n1: Vector3;
  let n2: Vector3;
  let p1: Vector3;
  let p2: Vector3;
  switch (side) {
    case 0:
      n1 = vec(1, 0, 0);
      n2 = vec(1, 0, 0);
      p1 = vec(0.5, 0, 0);
      p2 = vec(0.5, 0, 0);
      break;
    case 1:
      n1 = vec(-1, 0, 0);
      n2 = vec(-1, 0, 0);
      p1 = vec(-0.5, 0, 0);
      p2 = vec(-0.5, 0, 0);
      break;
    case 2:
      n1 = vec(0, 1, 0);
      n2 = vec(0, 1, 0);
      p1 = vec(0, 0.5, 0);
      p2 = vec(0, 0.5, 0);
      break;
    case 3:
      n1 = vec(0, -1, 0);
      n2 = vec(0, -1, 0);
      p1 = vec(0, -0.5, 0);
      p2 = vec(0, -0.5, 0);
      break;
    case 4:
      n1 = vec(0, 0, 1);
      n2 = vec(0, 0, 1);
      p1 = vec(0, 0, 0.5);
      p2 = vec(0, 0, 0.5);
      break;
    default:
      n1 = vec(0, 0, -1);
      n2 = vec(0, 0, -1);
      p1 = vec(0, 0, -0.5);
      p2 = vec(0, 0, -0.5);
      break;
  }

  n1.applyMatrix4(atom1.matrixWorld).sub(atom1.position);
  n2.applyMatrix4(atom2.matrixWorld).sub(atom2.position);
  const d = n1.dot(n2);

  // n1 and n2 are the unit normals for the supplied cube side
  // in world space for atom1 and atom2, respectively.
  //
  // They need to be collinear and  pointed in opposite directions for the sides
  // to be touching (though other considitions needs to be met as well), which
  // means that the dot product whould be close to -1.
  if (d > 0 || (d * -1) < COLLINEAR_OPPOSITE_THRESHOLD) {
    return false;
  }

  // At this point, the normals for the same side are collinear and
  // pointed in opposite directions, but that doesn't mean the sides 
  // are touching.

  // create the plane representing the side we are looking at for atom (cube) 1
  p1.applyMatrix4(atom1.matrixWorld);
  const plane1 = new Plane();
  plane1.setFromNormalAndCoplanarPoint(n1, p1);

  // p2 is a point on the side we're comparing for atom (cube) 2.
  // Ideally, this should be right on the plane we just created for atom 1, but
  // we can loosen this a bit.
  p2.applyMatrix4(atom2.matrixWorld);
  const distance = plane1.distanceToPoint(p2);
  return Math.abs(distance) <= PLANE_DISTANCE_THRESHOLD;
}

function isOneSidePlaneAligned(atom1: Object3D, atom2: Object3D): boolean {
  for (let side = 0; side < 6; side++) {
    if (isSidePlaneAligned(side, atom1, atom2)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if two atoms should bond.
 * 
 * @param atom1 first atome to check
 * @param atom2 second atom to check
 * @returns Return true if two atoms should bond.
 */
export function isAtomAtomBond(atom1: Object3D, atom2: Object3D): boolean {
  return boundingBox(atom1).intersectsBox(boundingBox(atom2)) && isOneSidePlaneAligned(atom1, atom2);
}

/**
 * Check if an atom and a molecule should bond.
 * 
 * @param atom atom to check
 * @param molecule molecule to check
 * @returns Return true if an atom and a molecule should bond.
 */
export function isAtomMoleculeBond(atom: Object3D, molecule: Object3D): boolean {
  const atomBB = boundingBox(atom);
  if (!atomBB.intersectsBox(boundingBox(molecule))) {
    // if the bounding boxes don't even touch, then for sure there's no bond
    return false;
  }

  // the bounding boxes touch, but there may or may not be an intersection
  for (const ma of molecule.children) {
    const molAtomBB = boundingBox(ma).applyMatrix4(ma.matrixWorld);
    if (atomBB.intersectsBox(molAtomBB) && isOneSidePlaneAligned(atom, ma)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two molecules hsould bond.
 * 
 * @param molecule1 first molecule to check
 * @param molecule2 second molecule to check
 * @returns Return true if two molecules hsould bond.
 */
export function isMoleculeMoleculeBond(molecule1: Object3D, molecule2: Object3D): boolean {
  if (!boundingBox(molecule1).intersectsBox(boundingBox(molecule2))) {
    // if the bounding boxes don't even touch, then for sure there's no bond
    return false;
  }

  // the bounding boxes touch, but there may or may not be an intersection
  for (const m1a of molecule1.children) {
    for (const m2a of molecule2.children) {
      const mol1AtomBB = boundingBox(m1a).applyMatrix4(m1a.matrixWorld);
      const mol2AtomBB = boundingBox(m2a).applyMatrix4(m2a.matrixWorld);
      if (mol1AtomBB.intersectsBox(mol2AtomBB) && isOneSidePlaneAligned(m1a, m2a)) {
        return true;
      }
    }
  }

  return false;
}
