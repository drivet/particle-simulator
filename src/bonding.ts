import { Object3D, Plane, Vector3 } from 'three';
import { boundingBox, vec } from './utils';

/**
 * Functions that implement "bonding" checks, i.e. code to detect when two Object3D 
 * groups representing atoms or molecules should bond.
 * 
 */

const COLLINEAR_THRESHOLD = 0.93;
const PLANE_DISTANCE_THRESHOLD = 0.3;

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

  let p: Vector3;
  switch (side) {
    case 0:
      p = vec(0.5, 0, 0);
      break;
    case 1:
      p = vec(-0.5, 0, 0);
      break;
    case 2:
      p = vec(0, 0.5, 0);
      break;
    case 3:
      p = vec(0, -0.5, 0);
      break;
    case 4:
      p = vec(0, 0, 0.5);
      break;
    default:
      p = vec(0, 0, -0.5);
      break;
  }

  const worldCubePoint1 = atom1.localToWorld(p.clone());
  const worldCubePoint2 = atom2.localToWorld(p.clone());
  //console.log("side: " + side + ", wc1 "+worldCubePoint1.toArray());
  //console.log("side: " + side + ", wc2 "+worldCubePoint1.toArray());
  
  const worldOrigin1 = atom1.localToWorld(vec(0, 0, 0));
  const worldOrigin2 = atom2.localToWorld(vec(0, 0, 0));
  //console.log("side: " + side + ", wo1 "+worldOrigin1.toArray());
  //console.log("side: " + side + ", wo2 "+worldOrigin2.toArray());
  
  const worldUnitDir1 = vec().subVectors(worldCubePoint1, worldOrigin1).normalize();
  const worldUnitDir2 = vec().subVectors(worldCubePoint2, worldOrigin2).normalize();
   
  //console.log("side: " + side + ", wn1 "+worldUnitDir1.toArray());
  //console.log("side: " + side + ", wn2 "+worldUnitDir2.toArray());

  const d = worldUnitDir1.dot(worldUnitDir2);
  //console.log("side: " + side + ", d: "+d);
  //
  // They need to be collinear and  pointed in opposite directions for the sides
  // to be touching (though other considitions needs to be met as well), which
  // means that the dot product whould be close to -1.
  if (d > 0 || (d * -1) < COLLINEAR_THRESHOLD) {
    return false;
  }

  // At this point, the normals for the same side are collinear and
  // pointed in opposite directions, but that doesn't mean the sides 
  // are touching.

  // create the plane representing the side we are looking at for atom (cube) 1
  const plane1 = new Plane();
  //console.log("setting plane n: " + worldUnitDir1.toArray() + ", point on plane: "+worldCubePoint1.toArray());
  plane1.setFromNormalAndCoplanarPoint(worldUnitDir1, worldCubePoint1);

  // p2 is a point on the side we're comparing for atom (cube) 2.
  // Ideally, this should be right on the plane we just created for atom 1, but
  // we can loosen this a bit.
  const distance = plane1.distanceToPoint(worldCubePoint2);
  //console.log("side: "+side + ", distance " + distance + ", from point "+ worldCubePoint2.toArray());
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
  return boundingBox(atom1).intersectsBox(boundingBox(atom2)) && 
         isOneSidePlaneAligned(atom1, atom2);
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
