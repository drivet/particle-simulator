import {
  BoxBufferGeometry,
  BufferGeometry,
  Euler, Group,
  Line,
  LineBasicMaterial, Mesh,
  MeshBasicMaterial,
  Object3D, Plane,
  Vector3
} from 'three';
import { euler, vec } from './utils';

/**
 * Code to deal with particle definition and spawning, and the specifics of how to
 * actually construct a new atom in the threejs scene.
 */

let id = 0;

const SIDE_0_X_MAX_COLOUR = 0xff0000; // red
const SIDE_1_X_MIN_COLOUR = 0xffa500; // orange
const SIDE_2_Y_MAX_COLOUR = 0xffff00; // yellow
const SIDE_3_Y_MIN_COLOUR = 0x008000; // green
const SIDE_4_Z_MAX_COLOUR = 0x0000ff; // blue
const SIDE_5_Z_MIN_COLOUR = 0x800080; // purple

// rotation at this "speed"
const STANDARD_ROTATION_INC = new Euler(0.01, 0.002, 0.004);

// move at this "speed"
const STANDARD_SPEED = 0.2;

const CUBE_SIZE = 5;

/**
 * A representation of a Particle - an atom or molecule.  Bundles together a threejs Object3D
 * instance and properties that are apply to whole groups, like trajectory and rotation increments.
 */
export interface Particle {
  isAtom: boolean;
  trajectoryUnit: Vector3;
  rotationInc: Euler;
  object: Object3D;
}

function newId(): number {
  const retId = id;
  id++;
  return retId;
}

// use this make a unique name for everything in the scene graph
function makeName(prefix: string): string {
  return `${prefix}${newId()}`
}

function initObject3D(object: Object3D, name: string, startPos: Vector3, startRot: Euler): Object3D {
  object.name = name;
  object.position.x = startPos.x;
  object.position.y = startPos.y;
  object.position.z = startPos.z;

  object.rotation.x += startRot.x;
  object.rotation.y += startRot.y;
  object.rotation.z += startRot.z;
  return object;
}

function addNormalLine(object: Object3D, n1: Vector3, color: number) {
  const n0 = new Vector3(0, 0, 0);
  const geo = new BufferGeometry().setFromPoints([n0, n1]);
  const n = new Line(geo, new LineBasicMaterial({ color }));
  n.name = "line";
  object.add(n);
}


function makeAtomSceneObject(startPos: Vector3, startRot: Euler): Object3D {
  const object = initObject3D(new Group(), makeName('atom_'), startPos, startRot);
  const geometry = new BoxBufferGeometry(1, 1, 1);
  geometry.computeBoundingBox();
  const materials = [
    new MeshBasicMaterial({ color: SIDE_0_X_MAX_COLOUR }),
    new MeshBasicMaterial({ color: SIDE_1_X_MIN_COLOUR }),
    new MeshBasicMaterial({ color: SIDE_2_Y_MAX_COLOUR }),
    new MeshBasicMaterial({ color: SIDE_3_Y_MIN_COLOUR }),
    new MeshBasicMaterial({ color: SIDE_4_Z_MAX_COLOUR }),
    new MeshBasicMaterial({ color: SIDE_5_Z_MIN_COLOUR }),
  ];
  const cubeMesh = new Mesh(geometry, materials);
  cubeMesh.name = "mesh";
  object.add(cubeMesh);

  addNormalLine(object, vec(1, 0, 0), SIDE_0_X_MAX_COLOUR);
  addNormalLine(object, vec(-1, 0, 0), SIDE_1_X_MIN_COLOUR);
  addNormalLine(object, vec(0, 1, 0), SIDE_2_Y_MAX_COLOUR);
  addNormalLine(object, vec(0, -1, 0), SIDE_3_Y_MIN_COLOUR);
  addNormalLine(object, vec(0, 0, 1), SIDE_4_Z_MAX_COLOUR);
  addNormalLine(object, vec(0, 0, -1), SIDE_5_Z_MIN_COLOUR);

  // stretch in all directions
  object.scale.set(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
  return object;
}

/**
 * Make a new atom with a particular position, rotation and trajectory.
 * 
 * @param startPos starting position of the atom
 * @param startRot starting rotational position of the atom
 * @param trajectoryUnit trajectory of the atom
 * @returns the new atom
 */
export function newAtom(startPos: Vector3, startRot: Euler, trajectoryUnit: Vector3): Particle {
  const object = makeAtomSceneObject(startPos, startRot);
  return { isAtom: true, object, trajectoryUnit, rotationInc: STANDARD_ROTATION_INC }
}

/**
 * Make a new molecule with a particular position, rotation and trajectory.
 * 
 * @param startPos starting position of the atom
 * @param startRot starting rotational position of the molecule
 * @param trajUnit trajectory of the molecule
 * @param atoms the atoms (Object3D instance) to include aspart of the molecule
 * @returns the new molecule
 */
export function newMolecule(startPos: Vector3, startRot: Euler, trajectoryUnit: Vector3,
                            ...atoms: Object3D[]): Particle {
  const object = initObject3D(new Group(), makeName('molecule_'), startPos, startRot);
  for (const a of atoms) {
      object.attach(a);
  }
  return { isAtom: false, object, trajectoryUnit, rotationInc: STANDARD_ROTATION_INC }
}

/**
 * Create a new molecule with a specified number of atoms, arranged in a line along the x axis
 * 
 * @param startPos 
 * @param startRot 
 * @param trajectoryUnit 
 */
export function newLineMolecule(startPos: Vector3, startRot: Euler, trajectoryUnit: Vector3, count: number) {
  const atoms: Object3D[] = [];
  for (let i = 0; i < count; i++) {
    const a = makeAtomSceneObject(vec(), euler());
    // rotate every second atom so the side colour matches the previous
    if (i % 2 === 1) {
      a.rotation.y = Math.PI;
    }
    // move atom down the line, but then add a constant shift back
    // so we can have it all centered on the orioin.
    a.position.x = (i * CUBE_SIZE) - ( (CUBE_SIZE * count) / 2);
    // we're going to use newMolecule later which assumes the atoms are in world coordinates
    a.position.add(startPos);
    atoms.push(a);
  }
  return newMolecule(startPos, startRot, trajectoryUnit, ...atoms);
}

/**
 * Move the particle one frame according to its trajectory and rotational parameters.
 * 
 * @param p the particle to update
 */
export function updateParticle(p: Particle) {
  p.object.rotation.x += p.rotationInc.x;
  p.object.rotation.y += p.rotationInc.y;
  p.object.rotation.z += p.rotationInc.z;

  const moveBy = new Vector3();
  moveBy.copy(p.trajectoryUnit);
  moveBy.multiplyScalar(STANDARD_SPEED);
  p.object.position.add(moveBy);

  // world matrix is normally updated every frame, but we need an updated
  // version *now*, after we've just updated all the geometric parameters,
  // so calculate it here.
  p.object.updateMatrixWorld(true);
}

/**
 * Move the particle back a tick a frame the reverse of its trajectory.
 * Used during a collision to prevent getting stuck in the wall.
 * 
 * @param p the particle to reverse
 */
export function reverseSlightly(p: Particle) {
  p.object.position.add(new Vector3().copy(p.trajectoryUnit).multiplyScalar(STANDARD_SPEED).negate());
}

/**
 * This should "bounce" a particle off of a plane by reflecting
 * its trajectory.
 * 
 * @param p the particle to relfect
 * @param plane the plane to reflect the particle on
 */
export function reflect(p: Particle, plane: Plane) {
  p.trajectoryUnit.reflect(plane.normal).normalize();
}
