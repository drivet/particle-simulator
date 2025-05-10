import { Euler, Object3D, Vector3, MathUtils } from 'three';
import { Box3 } from './box3';

const ZERO_THRESHOLD = 0.001;

export function boundingBox(object: Object3D) {
  const box = new Box3(new Vector3(), new Vector3());
  box.setFromObject(object);
  return box;
}

export function vec(x?: number, y?: number, z?: number): Vector3 {
  return new Vector3(x, y, z);
}

export function uVec(x?: number, y?: number, z?: number): Vector3 {
  return vec(x, y, z).normalize();
}

export function euler(x?: number, y?: number, z?: number): Euler {
  return new Euler(x, y, z);
}

export function avg(v1: Vector3, v2: Vector3): Vector3 {
  const v3 = new Vector3();
  v3.addVectors(v1, v2);
  v3.divideScalar(2);
  return v3;
}

export function cross(v1: Vector3, v2: Vector3): Vector3 {
  const v3 = new Vector3();
  v3.crossVectors(v1, v2);
  return v3;
}

export function randomVector(min: number, max: number): Vector3 {
  const v = new Vector3();
  v.set(MathUtils.randFloat(min, max), MathUtils.randFloat(min, max), MathUtils.randFloat(min, max));
  return v;
}

export function randomEuler(): Euler {
  const min = -2 * Math.PI;
  const max = 2 * Math.PI
  return euler(MathUtils.randFloat(min, max), MathUtils.randFloat(min, max), MathUtils.randFloat(min, max));
}

export function isZero(v: Vector3): boolean {
  return Math.abs(v.x) <= ZERO_THRESHOLD && Math.abs(v.y) <= ZERO_THRESHOLD && Math.abs(v.z) <= ZERO_THRESHOLD;
}
