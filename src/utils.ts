import { Euler, Object3D, Vector3, MathUtils } from 'three';
import { Box3 } from './box3';

/**
 * A bunch of utility function so I don't have to type as much
 * 
 */
const ZERO_THRESHOLD = 0.001;

/**
 * Calculate the bounding box for an object.
 * 
 * @param object the threejs object to calculate the bounding box for
 * @returns the bounding box
 */
export function boundingBox(object: Object3D): Box3 {
  const box = new Box3(new Vector3(), new Vector3());
  box.setFromObject(object);
  return box;
}

/**
 * Create a Vector3 instance with less typing.
 * 
 * @param x x param
 * @param y y param
 * @param z z param
 * @returns the new vector
 */
export function vec(x?: number, y?: number, z?: number): Vector3 {
  return new Vector3(x, y, z);
}

/**
 * Create a new vector and then normalize it to a unit vector.
 * 
 * @param x x param
 * @param y x param
 * @param z z param
 * @returns the normalized vector
 */
export function uVec(x?: number, y?: number, z?: number): Vector3 {
  return vec(x, y, z).normalize();
}

/**
 * Create a euler instance iwth less typing.
 * 
 * @param x x rotation param
 * @param y y rotation param
 * @param z z rotation param
 * @returns the new Euler instance
 */
export function euler(x?: number, y?: number, z?: number): Euler {
  return new Euler(x, y, z);
}

/**
 * Quickly generate a new vector which is the average of two vectors.
 * 
 * @param v1 first vector
 * @param v2 second vector
 * @returns the average vector
 */
export function avg(v1: Vector3, v2: Vector3): Vector3 {
  const v3 = new Vector3();
  v3.addVectors(v1, v2);
  v3.divideScalar(2);
  return v3;
}

/**
 * Quickly generate a new product in one line with less typing.
 * 
 * @param v1 first vector
 * @param v2 second vector
 * @returns the new cross product
 */
export function cross(v1: Vector3, v2: Vector3): Vector3 {
  const v3 = new Vector3();
  v3.crossVectors(v1, v2);
  return v3;
}

/**
 * Generate a vector with components that are randomized from a min-max range.
 * 
 * @param min minimum floor for random number
 * @param max maximum floor for random number
 * @returns the new random vector
 */
export function randomVector(min: number, max: number): Vector3 {
  const v = new Vector3();
  v.set(MathUtils.randFloat(min, max), MathUtils.randFloat(min, max), MathUtils.randFloat(min, max));
  return v;
}

/**
 * Generate a random Euler value, with the rotational components taken
 * from -2PI to 2PI, i.e. the full circle.
 * 
 * @returns the new random Euler
 */
export function randomEuler(): Euler {
  const min = -2 * Math.PI;
  const max = 2 * Math.PI
  return euler(MathUtils.randFloat(min, max), MathUtils.randFloat(min, max), MathUtils.randFloat(min, max));
}

/**
 * Check if a vector is "close" to zero.
 * 
 * @param v the vector to check
 * @returns true if the vector is close to zero
 */
export function isZero(v: Vector3): boolean {
  return Math.abs(v.x) <= ZERO_THRESHOLD && Math.abs(v.y) <= ZERO_THRESHOLD && Math.abs(v.z) <= ZERO_THRESHOLD;
}
