import { Object3D, Plane, Vector3 } from 'three';
import { boundingBox, vec } from './utils';

const COLLINEAR_THRESHOLD = 0.99;
const ZERO_THRESHOLD = 0.001;

/**
 * Should really only be called with atoms.
 * WARNING: This assumes that the atom box is 1 x 1 x 1 in local space.
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

  n1.applyMatrix4(atom1.matrixWorld).sub(atom1.position).normalize();
  n2.applyMatrix4(atom2.matrixWorld).sub(atom2.position).normalize();
  const d = n1.dot(n2);
  //console.log("atom1 position: "+ atom1.position.toArray());
  //console.log("normal d check - side: " + side + ", n1: " + n1.toArray() + ", n2: " + n2.toArray() + ", d: "+d);
  if (d > 0 || (d * -1) < COLLINEAR_THRESHOLD) {
    return false;
  }

  p1.applyMatrix4(atom1.matrixWorld);
  p2.applyMatrix4(atom2.matrixWorld);

  const plane1 = new Plane();
  plane1.setFromNormalAndCoplanarPoint(n1, p1);
  const distance = plane1.distanceToPoint(p2);

  //console.log("plane distance check - side " + side + ", p1: " + p1.toArray() + ", p2: "+ p2.toArray() + ", distance: "+ distance);

  return Math.abs(distance) <= ZERO_THRESHOLD;
}

function isOneSidePlaneAligned(atom1: Object3D, atom2: Object3D): boolean {
  for (let side = 0; side < 6; side++) {
    if (isSidePlaneAligned(side, atom1, atom2)) {
      return true;
    }
  }
  return false;
}

export function isAtomAtomBond(atom1: Object3D, atom2: Object3D): boolean {
  return boundingBox(atom1).intersectsBox(boundingBox(atom2)) && isOneSidePlaneAligned(atom1, atom2);
}

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
