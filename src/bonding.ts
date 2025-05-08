import { Object3D, Vector3 } from 'three';
import { boundingBox, vec } from './utils';

const COLLINEAR_THRESHOLD = 0.99;

/**
 * Should really only be called with atoms.
 * WARNING: This assumes that the atom box is 1 x 1 x 1 in local space.
 * 
 */
function worldNormal(side: number, object: Object3D): Vector3 {
    if (side < 0 || side > 5) {
        throw new Error("side must be between 0 and 5");
    }

    let n: Vector3;
    switch (side) {
        case 0:
            n = vec(1, 0, 0);
            break;
        case 1:
            n = vec(-1, 0, 0);
            break;
        case 2:
            n = vec(0, 1, 0);
            break;
        case 3:
            n = vec(0, -1, 0);
            break;
        case 4:
            n = vec(0, 0, 1);
            break;
        default:
            n = vec(0, 0, -1);
            break;
    }

    const wn = n.applyMatrix4(object.matrixWorld);
    return wn.sub(object.position).normalize();
}

function sameColourTouching(trajectory: Vector3, atom1: Object3D, atom2: Object3D): boolean {
    for (let side = 0; side < 6; side++) {
        const wn1 = worldNormal(side, atom1);
        const wn2 = worldNormal(side, atom2);
        const d1 = wn1.dot(wn2);
        const d2 = wn1.dot(trajectory);
        if ((d1 * -1) >= COLLINEAR_THRESHOLD && Math.abs(d2) >= COLLINEAR_THRESHOLD) {
            // same coloured normals are pointed in opposite directions AND
            // the normal is in the direction of the trajectory
            // this is a bonding condition if the atoms are touching
            return true;
        }
    }
    return false;
}

export function isAtomAtomBond(trajectory: Vector3, atom1: Object3D, atom2: Object3D): boolean {
    return boundingBox(atom1).intersectsBox(boundingBox(atom2)) &&
        sameColourTouching(trajectory, atom1, atom2);
}

export function isAtomMoleculeBond(trajectory: Vector3, atom: Object3D, molecule: Object3D): boolean {
    const atomBB = boundingBox(atom);
    if (!atomBB.intersectsBox(boundingBox(molecule))) {
        // if the bounding boxes don't even touch, then for sure there's no bond
        return false;
    }

    // the bounding boxes touch, but there may or may not be an intersection
    for (const ma of molecule.children) {
        const molAtomBB = boundingBox(ma).applyMatrix4(ma.matrixWorld);
        if (atomBB.intersectsBox(molAtomBB) && sameColourTouching(trajectory, atom, ma)) {
            return true;
        }
    }

    return false;
}

export function isMoleculeMoleculeBond(trajectory: Vector3, molecule1: Object3D, molecule2: Object3D): boolean {
    if (!boundingBox(molecule1).intersectsBox(boundingBox(molecule2))) {
        // if the bounding boxes don't even touch, then for sure there's no bond
        return false;
    }

    // the bounding boxes touch, but there may or may not be an intersection
    for (const m1a of molecule1.children) {
        for (const m2a of molecule2.children) {
            const mol1AtomBB = boundingBox(m1a).applyMatrix4(m1a.matrixWorld);
            const mol2AtomBB = boundingBox(m2a).applyMatrix4(m2a.matrixWorld);
            if (mol1AtomBB.intersectsBox(mol2AtomBB) && sameColourTouching(trajectory, m1a, m2a)) {
                return true;
            }
        }
    }

    return false;
}
