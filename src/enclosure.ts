import { Plane, Vector3 } from 'three';
import { Box3 } from './box3';

/**
 * I thought I could just use a Box3 to define the "glass enclosure"
 * but I was having trouble doing collision detection - it was as if "intersect" was
 * always true if the cube was in the box.
 *
 * So I'm going to try representing the glass box as 6 separate planes and testing
 * intersection with each of those.
 *
 * The glass box here is aligned and centered on the axes.
 */
export class Enclosure {
    private planeMinX: Plane;
    private planeMaxX: Plane;
    private planeMinY: Plane;
    private planeMaxY: Plane;
    private planeMinZ: Plane;
    private planeMaxZ: Plane;
    constructor(
        minX: number,
        maxX: number,
        minY: number,
        maxY: number,
        minZ: number,
        maxZ: number
    ) {
        this.planeMinX = new Plane(new Vector3(1, 0, 0), -minX);
        this.planeMaxX = new Plane(new Vector3(-1, 0, 0), maxX);
        this.planeMinY = new Plane(new Vector3(0, 1, 0), -minY);
        this.planeMaxY = new Plane(new Vector3(0, -1, 0), maxY);
        this.planeMinZ = new Plane(new Vector3(0, 0, 1), -minZ);
        this.planeMaxZ = new Plane(new Vector3(0, 0, -1), maxZ);
    }

    collision(bb: Box3): Plane | undefined {
        if (this.planeMinX.intersectsBox(bb)) {
            return this.planeMinX;
        } else if (this.planeMaxX.intersectsBox(bb)) {
            return this.planeMaxX;
        } else if (this.planeMinY.intersectsBox(bb)) {
            return this.planeMinY;
        } else if (this.planeMaxY.intersectsBox(bb)) {
            return this.planeMaxY;
        } else if (this.planeMinZ.intersectsBox(bb)) {
            return this.planeMinZ;
        } else if (this.planeMaxZ.intersectsBox(bb)) {
            return this.planeMaxZ;
        } else {
            return undefined;
        }
    }
}
