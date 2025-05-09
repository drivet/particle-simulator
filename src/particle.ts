import {
  BoxBufferGeometry,
  BufferGeometry,
  Euler, Group,
  Line,
  LineBasicMaterial, Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3
} from 'three';
import { vec } from './utils';

let id = 0;

const SIDE_0_X_MAX_COLOUR = 0xff0000; // red
const SIDE_1_X_MIN_COLOUR = 0xffa500; // orange
const SIDE_2_Y_MAX_COLOUR = 0xffff00; // yellow
const SIDE_3_Y_MIN_COLOUR = 0x008000; // green
const SIDE_4_Z_MAX_COLOUR = 0x0000ff; // blue
const SIDE_5_Z_MIN_COLOUR = 0x800080; // purple

const STANDARD_ROTATION = new Euler(0.01, 0.002, 0.004);

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

function makeName(prefix: string): string {
  return `${prefix}${newId()}`
}

function initObject3D(object: Object3D, name: string, startPos: Vector3, startRot: Euler): Object3D {
  object.name = name;
  object.position.copy(startPos);
  object.rotation.copy(startRot);
  return object;
}

function addNormalLine(object: Object3D, n1: Vector3, color: number) {
  const n0 = new Vector3(0, 0, 0);
  const geo = new BufferGeometry().setFromPoints([n0, n1]);
  const n = new Line(geo, new LineBasicMaterial({ color }));
  n.name = "line";
  object.add(n);
}

function addCubeMesh(object: Object3D) {
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
  // stretch in all directions, so this will make the cubes 10 length
  object.scale.set(5, 5, 5);
}

export function newAtom(startPos: Vector3, startRot: Euler, trajUnit: Vector3): Particle {
  const object = initObject3D(new Group(), makeName('atom_'), startPos, startRot);

  addCubeMesh(object);
  addNormalLine(object, vec(1, 0, 0), SIDE_0_X_MAX_COLOUR);
  addNormalLine(object, vec(-1, 0, 0), SIDE_1_X_MIN_COLOUR);
  addNormalLine(object, vec(0, 1, 0), SIDE_2_Y_MAX_COLOUR);
  addNormalLine(object, vec(0, -1, 0), SIDE_3_Y_MIN_COLOUR);
  addNormalLine(object, vec(0, 0, 1), SIDE_4_Z_MAX_COLOUR);
  addNormalLine(object, vec(0, 0, -1), SIDE_5_Z_MIN_COLOUR);

  return { isAtom: true, object, trajectoryUnit: trajUnit, rotationInc: STANDARD_ROTATION }
}

export function newMolecule(startPos: Vector3, startRot: Euler, trajUnit: Vector3,
                            ...atoms: Object3D[]): Particle {
  const object = initObject3D(new Group(), makeName('molecule_'), startPos, startRot);
  for (const a of atoms) {
      object.attach(a);
  }
  return { isAtom: false, object, trajectoryUnit: trajUnit, rotationInc: STANDARD_ROTATION }
}
