import { BoxBufferGeometry, MathUtils, Mesh, MeshBasicMaterial, Object3D, Plane, Scene, Vector3 } from 'three';
import { boundingBox, vec } from './utils';
import { reverseSlightly, Particle, reflect } from './particle';

const EDGE_CLEARANCE_PERCENT = 0.1;

/**
 * A class to represent the glass enclosure that traps all the particles.
 * 
 * I thought I could just use a Box3 to define the "glass enclosure"
 * but I was having trouble doing wall collision detection - it was as 
 * if "intersect" was always true if the cube was in the box, which of
 * course they always are.
 *
 * So I'm going to try representing the glass box as 6 separate planes and testing
 * intersection with each of those.
 *
 */
export class Enclosure {
  private sizeX: number;
  private sizeY: number;
  private sizeZ: number;
  private box: Object3D;
  private planes: Plane[];
  private clearX: number;
  private clearY: number;
  private clearZ: number;

  /**
   * Build a new enclosure by specifying the min and max values along all the axes and the scene.
   * Add a mesh box representing the enclosure to the scene.
   * 
   * @param scene 
   * @param minX 
   * @param maxX 
   * @param minY 
   * @param maxY 
   * @param minZ 
   * @param maxZ 
   */
  constructor(
    private scene: Scene,
    private minX: number,
    private maxX: number,
    private minY: number,
    private maxY: number,
    private minZ: number,
    private maxZ: number
  ) {
    this.planes = [
      new Plane(vec(1, 0, 0), -minX),
      new Plane(vec(-1, 0, 0), maxX),
      new Plane(vec(0, 1, 0), -minY),
      new Plane(vec(0, -1, 0), maxY),
      new Plane(vec(0, 0, 1), -minZ),
      new Plane(vec(0, 0, -1), maxZ),
    ];

    this.sizeX = maxX - minX;
    this.sizeY = maxY - minY;
    this.sizeZ = maxZ - minZ;

    this.clearX = EDGE_CLEARANCE_PERCENT * this.sizeX;
    this.clearY = EDGE_CLEARANCE_PERCENT * this.sizeY;
    this.clearZ = EDGE_CLEARANCE_PERCENT * this.sizeZ;

    const geometry = new BoxBufferGeometry(this.sizeX, this.sizeY, this.sizeZ);
    const material = new MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.2 });
    this.box = new Mesh(geometry, material);
    this.scene.add(this.box);
  }

  /**
   * Take a particle and test if it's touch a wall of the enclosure.  If it is, then "bounce" 
   * it by relecting it's trajectory.
   * 
   * @param p the particle to test for wall collision
   */
  maybeBounce(p: Particle) {
    const bb = boundingBox(p.object);
    const plane = this.planes.find(p => p.intersectsBox(bb));
    if (plane) {
      // Bounce the atom off the plane by reflecting the trajectory.
      // BUT Sometimes the atom gets embedded in the plane which can wreak havoc when we
      // change the trajectory, so we're going to move the atom back a little bit, and
      // then reflect the trajectory
      reverseSlightly(p);
      reflect(p, plane);
    }
  }

  /**
   * Return a random position vector in the enclosure, arbitrarily considering about 80% of the volume
   * so we don't get a position too close to the edge.
   * */
  randomPos(): Vector3 {
    const x = MathUtils.randFloat(this.minX + this.clearX, this.maxX - this.clearX);
    const y = MathUtils.randFloat(this.minY + this.clearY, this.maxY - this.clearY);
    const z = MathUtils.randFloat(this.minZ + this.clearZ, this.maxZ - this.clearZ);
    return vec(x, y, z);
  }
}
