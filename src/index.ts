import {
  Scene,
  Color,
  Mesh,
  MeshBasicMaterial,
  BoxBufferGeometry,
  PerspectiveCamera,
  WebGLRenderer,
  OrthographicCamera,
  Vector3,
  Box3,
  Plane,
  Group,
  Object3D,
  BufferGeometry,
  Line,
  LineBasicMaterial, Euler,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";

/**
 * I DON'T WANT TO DO THIS, but I have no idea how we can do bounding box
 * calculations while at the same time ignoring the normal lines sticking
 * out of the box, which feels like the appropriate thing to do.
 */
const _vector = /*@__PURE__*/ new Vector3();
const _box = /*@__PURE__*/ new Box3();
Box3.prototype.expandByObject = function(object: any, precise = false): Box3 {
  object.updateWorldMatrix( false, false );
  const geometry = object.geometry;
  if ( geometry !== undefined ) {

    const positionAttribute = geometry.getAttribute( 'position' );
    if ( precise === true && positionAttribute !== undefined && object.isInstancedMesh !== true ) {
      for ( let i = 0, l = positionAttribute.count; i < l; i ++ ) {

        if ( object.isMesh === true ) {
          object.getVertexPosition( i, _vector );
        } else {
          _vector.fromBufferAttribute( positionAttribute, i );
        }
        _vector.applyMatrix4( object.matrixWorld );
        this.expandByPoint( _vector );
      }
    } else {
      if ( object.boundingBox !== undefined ) {
        // object-level bounding box
        if ( object.boundingBox === null ) {
          object.computeBoundingBox();
        }
        _box.copy( object.boundingBox );
      } else {
        // geometry-level bounding box
        if ( geometry.boundingBox === null ) {
          geometry.computeBoundingBox();
        }
        _box.copy( geometry.boundingBox );
      }

      _box.applyMatrix4( object.matrixWorld );
      this.union( _box );
    }
  }

  const children = object.children.filter(c => c.name !== "line");
  for ( let i = 0, l = children.length; i < l; i ++ ) {
    this.expandByObject( children[ i ], precise );
  }

  return this;
}

//
let id = 0;
function newId(): number {
  const retId = id;
  id++;
  return retId;
}

function name(prefix: string): string {
  return `${prefix}${newId()}`
}

const COLLINEAR_THRESHHOLD = 0.99;
const ZERO_THRESHOLD = 0.001;

function boundingBox(object: Object3D) {
  const box = new Box3(new Vector3(), new Vector3());
  box.setFromObject(object);
  return box;
}

function vec(x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z);
}

function uVec(x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z).normalize();
}

function euler(x: number, y: number, z: number): Euler {
  return new Euler(x, y, z);
}

function avg(v1: Vector3, v2: Vector3) {
  const v3 = new Vector3();
  v3.addVectors(v1, v2);
  v3.divideScalar(2);
  return v3;
}

function cross(v1: Vector3, v2: Vector3) {
  const v3 = new Vector3();
  v3.crossVectors(v1, v2);
  return v3;
}

function randomVector(): Vector3 {
  const v = new Vector3();
  v.set(Math.random(), Math.random(), Math.random());
  return v;
}

function zero(v: Vector3): boolean {
  return Math.abs(v.x - 0) <= ZERO_THRESHOLD && Math.abs(v.y - 0) <= ZERO_THRESHOLD && Math.abs(v.z - 0) <= ZERO_THRESHOLD;
}

interface Particle {
  isAtom: boolean;
  trajectoryUnit: Vector3;
  rotationInc: Euler | null;
  object: Object3D;
}

function initObject3D(object: Object3D, name: string, startPos: Vector3, startRot: Euler | null): Object3D {
  object.name = name;
  object.position.copy(startPos);
  object.rotation.copy(startRot ? startRot : new Euler());
  return object;
}

function addCubeToGroup(object: Object3D) {
  const geometry = new BoxBufferGeometry(1, 1, 1);
  geometry.computeBoundingBox();
  const materials = [
    new MeshBasicMaterial({ color: 0xff0000 }),
    new MeshBasicMaterial({ color: 0xffa500 }),
    new MeshBasicMaterial({ color: 0xffff00 }),
    new MeshBasicMaterial({ color: 0x008000 }),
    new MeshBasicMaterial({ color: 0x0000ff }),
    new MeshBasicMaterial({ color: 0x800080 }),
  ];
  const cubeMesh = new Mesh(geometry, materials);
  cubeMesh.name = "mesh";
  object.add(cubeMesh);
  // stretch in all directions, so this will make the cubes 10 length
  object.scale.set(5, 5, 5);
}

function makeAtom(startPos: Vector3, startRot: Euler | null,
                  rotationInc: Euler | null, trajectoryUnit: Vector3): Particle {
  const object = initObject3D(new Group(), name('atom_'), startPos, startRot);

  function addNormalLine(n1: Vector3, color: number) {
    const n0 = new Vector3(0, 0, 0);
    const geo = new BufferGeometry().setFromPoints([n0, n1]);
    const n = new Line(geo, new LineBasicMaterial({ color }));
    n.name = "line";
    object.add(n);
  }

  addCubeToGroup(object);

  addNormalLine(vec(1.5, 0, 0), 0xff0000);
  addNormalLine(vec(-1.5, 0, 0), 0xffa500);
  addNormalLine(vec(0, 1.5, 0), 0xffff00);
  addNormalLine(vec(0, -1.5, 0), 0x008000);
  addNormalLine(vec(0, 0, 1.5), 0x0000ff);
  addNormalLine(vec(0, 0, -1.5), 0x800080);

  return { isAtom: true, object, trajectoryUnit, rotationInc }
}

function makeMolecule(startPos: Vector3, startRot: Euler | null,
                      rotationInc: Euler | null, trajectoryUnit: Vector3,
                      ...atoms: Object3D[]): Particle {
  const object = initObject3D(new Group(), name('molecule_'), startPos, startRot);
  for (const a of atoms) {
    object.attach(a);
  }
  return { isAtom: false, object, trajectoryUnit, rotationInc }
}

/**
 * Should really only be called with atoms
 */
function worldNormal(object: Object3D, side: number): Vector3 {
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

function updateParticle(p: Particle, glassBox: GlassBox) {
  if (p.rotationInc) {
    p.object.rotation.x += p.rotationInc.x;
    p.object.rotation.y += p.rotationInc.y;
    p.object.rotation.z += p.rotationInc.z;
  } else {
    p.object.rotation.x += 0.01;
    p.object.rotation.y += 0.002;
    p.object.rotation.z += 0.004;
  }

  const moveBy = new Vector3();
  moveBy.copy(p.trajectoryUnit);
  moveBy.multiplyScalar(0.5);
  p.object.position.add(moveBy);

  // world matrix is normally updated every frame, but we need an updated
  // version *now*, after we've just updated all the geometric parameters,
  // so calculate it here.
  p.object.updateMatrixWorld(true);

  const thisBox = boundingBox(p.object);
  const plane = glassBox.collision(thisBox);
  if (plane) {
    p.trajectoryUnit.reflect(plane.normal);
  }
}

function isBondable(particle1: Particle, particle2: Particle): boolean {
  if (particle1.isAtom && particle2.isAtom) {
    return isBondableAtoms(particle1.trajectoryUnit, particle1.object, particle2.object);
  } else if (particle1.isAtom && !particle2.isAtom) {
    return isMoleculeBondableToAtom(particle1.trajectoryUnit, particle1.object, particle2.object);
  } else if (!particle1.isAtom && particle2.isAtom) {
    return isMoleculeBondableToAtom(particle2.trajectoryUnit, particle2.object, particle1.object);
  } else {
    return false;
  }
}

function isBondableAtoms(trajectory: Vector3, atom1: Object3D, atom2: Object3D): boolean {
  return boundingBox(atom1).intersectsBox(boundingBox(atom2)) &&
         sameColourTouching(trajectory, atom1, atom2);
}

function sameColourTouching(trajectory: Vector3, atom1: Object3D, atom2: Object3D): boolean {
  for (let side = 0; side < 6; side++) {
    const wn1 = worldNormal(atom1, side);
    const wn2 = worldNormal(atom2, side);
    const d1 = wn1.dot(wn2);
    const d2 = wn1.dot(trajectory);
    if ((d1 * -1) >= COLLINEAR_THRESHHOLD && Math.abs(d2) >= COLLINEAR_THRESHHOLD) {
      // same coloured normals are pointed in opposite directions AND
      // the normal is in the direction of the trajectory
      // this is a bonding condition if the atoms are touching
      return true;
    }
  }
  return false;
}

function isMoleculeBondableToAtom(trajectory: Vector3, atom: Object3D, molecule: Object3D): boolean {
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

/**
 * Manages all the particles in the scene
 */
class ParticleGroup {
  private particles = new Map<string, Particle>();

  // create the bounding box that we will eventually bounce off of
  private glassBox = new GlassBox(-100, 100, -100, 100, -100, 100);

  constructor(private scene: Scene) {
    this.makeAtom(vec(50, 0, 0), euler(0, 0, 0), uVec(-1, 0, 0));
    this.makeAtom(vec(-50, 0, 0), euler(0, Math.PI, 0), uVec(1, 0, 0));
    this.makeAtom(vec(-5, 30, 0), euler(Math.PI, 0, 0), uVec(0, -1, 0));

    /*
    this.makeAtom(vec(50, -50, 1), euler(0, 0, 0), uVec(-1, 0, 0));
    this.makeAtom(vec(-50, -50, -1), euler(0, Math.PI, 0), uVec(1, 0, 0));
    */
    /*
    this.makeAtom(vec(20, 5, 10), uVec(1, 1, 0));
    this.makeAtom(vec(0, 0, 0), uVec(1, 0, 1));
    this.makeAtom(vec(40, 40, 40), uVec(0, 1, 1));
    this.makeAtom(vec(60, 60, 60), uVec(1, 1, 0));
    */
  }

  private makeAtom(startPos: Vector3, startRot: Euler, trajectoryUnit: Vector3) {
    this.add(makeAtom(startPos, startRot, euler(0, 0, 0), trajectoryUnit));
  } 
  
  update() {
    for (const p of this.allParticles()) {
      updateParticle(p, this.glassBox);
    }
    this.condense();
  }

  condense() {
    let done = false;
    while (!done) {
      done = this.maybeBond();
    }
  }


  private remove(p: Particle) {
    this.scene.remove(p.object);
    this.particles.delete(p.object.name);
  }

  private add(p: Particle) {
    this.scene.add(p.object);
    this.particles.set(p.object.name, p);
  }

  private maybeBond(): boolean {
    const particles = this.allParticles();
    for(let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        if (isBondable(particles[i], particles[j])) {
          this.bondParticles(particles[i], particles[j]);
          return false;
        }
      }
    }
    return true;
  }

  private bondParticles(p1: Particle, p2: Particle) {
    if (p1.isAtom && p2.isAtom) {
      this.makeNewMolecule(p1, p2);
    } else if (p1.isAtom && !p2.isAtom) {
      this.addAtomToMolecule(p1, p2);
    } else if (!p1.isAtom && p2.isAtom) {
      this.addAtomToMolecule(p2, p1);
    }
    // TODO the rest of the cases
  }

  /**
   * Make atom1 and atom2 into a new molecule (atom1 and atom2 go away)
   * atom1 and atom2 are removed from scene and a new Group is created with
   * atom1 and atom2 as children, which is then added to scene
   */
  private makeNewMolecule(atom1: Particle, atom2: Particle) {
    this.remove(atom1);
    this.remove(atom2);

    const startPos = avg(atom1.object.position, atom2.object.position);
    let trajectoryUnit = cross(atom1.trajectoryUnit, atom2.trajectoryUnit);
    if (zero(trajectoryUnit)) {
      trajectoryUnit = randomVector();
    }
    const molecule = makeMolecule(startPos, null, null, trajectoryUnit, atom1.object, atom2.object);
    this.add(molecule);
  }

  /**
   * absorb atom1 into molecule
   * atom is removed from scene and added to molecule's Group
   */
  private addAtomToMolecule(atom: Particle, molecule: Particle) {
    this.remove(atom);
    molecule.object.attach(atom.object);
  }

  /**
   * Combine two molecules together
   * Molecule2's Group is remove from scene, and it's children are added to molecule1
   */
  private mergeMolecules(molecule1: Particle, molecule2: Particle) {
    //this.scene.remove(molecule2);
    //molecule2.children.forEach((c) => molecule1.attach(c));

    // TODO adjust particle map
    // keep trajectory of surviving particle
  }

  private allParticles(): Particle[] {
    return Array.from(this.particles.values());
  }
}

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
  class GlassBox {
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

    collision(bb: Box3) {
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

  class Main {
    public scene: Scene;
    public camera: PerspectiveCamera | OrthographicCamera;
    public renderer: WebGLRenderer;
    public controls: OrbitControls;
    public stats: Stats;
    public particleGroup: ParticleGroup;

    constructor() {
      this.initViewport();
    }

    /** Initialize the viewport */
    public initViewport() {
      // Init scene.
      this.scene = new Scene();
      this.scene.background = new Color("#191919");

      // Init camera.
      const aspect = window.innerWidth / window.innerHeight;
      this.camera = new PerspectiveCamera(50, aspect, 1, 1000);
      this.camera.position.z = 300;

      // Init renderer.
      this.renderer = new WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true,
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setAnimationLoop(() => this.animate());
      document.body.appendChild(this.renderer.domElement);
      window.addEventListener("resize", () => this.onResize());

      // Init stats.
      this.stats = new Stats();
      document.body.appendChild(this.stats.dom);

      // Init orbit controls.
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.update();
      this.controls.addEventListener("change", () => this.render());

      this.particleGroup = new ParticleGroup(this.scene);

      this.render();
    }

    private render() {
      this.stats.begin();
      this.renderer.render(this.scene, this.camera);
      this.stats.end();
    }

    public animate() {
      this.stats.begin();
      this.particleGroup.update();
      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      this.stats.end();
    }

    public onResize() {
      if (this.camera instanceof PerspectiveCamera) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      }
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.render();
    }
  }

  new Main();
