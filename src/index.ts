import {
  Scene,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  OrthographicCamera,
  Vector3,
  Euler,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import { Enclosure } from './enclosure';
import { avg, boundingBox, cross, euler, randomVector, uVec, vec, isZero } from './utils';
import { isAtomAtomBond, isAtomMoleculeBond, isMoleculeMoleculeBond } from './bonding';
import { newAtom, newMolecule, Particle } from './particle';

function updateParticle(p: Particle, glassBox: Enclosure) {
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

/**
 * Manages all the particles in the scene
 */
class ParticleGroup {
  private particles = new Map<string, Particle>();

  // create the bounding box that we will eventually bounce off of
  private enclosure = new Enclosure(-100, 100, -100, 100, -100, 100);

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
    this.add(newAtom(startPos, startRot, euler(0, 0, 0), trajectoryUnit));
  }

  update() {
    for (const p of this.allParticles()) {
      updateParticle(p, this.enclosure);
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
        const p1 = particles[i];
        const p2 = particles[j];
        if (p1.isAtom && p2.isAtom && isAtomAtomBond(p1.trajectoryUnit, p1.object, p2.object)) {
          this.makeNewMolecule(p1, p2);
          return false;
        } else if (p1.isAtom && !p2.isAtom && isAtomMoleculeBond(p1.trajectoryUnit, p1.object, p2.object)) {
          this.addAtomToMolecule(p1, p2);
          return false;
        } else if (!p1.isAtom && p2.isAtom && isAtomMoleculeBond(p2.trajectoryUnit, p2.object, p1.object)) {
          this.addAtomToMolecule(p2, p1);
          return false;
        } else if (!p1.isAtom && !p2.isAtom && isMoleculeMoleculeBond(p2.trajectoryUnit, p2.object, p1.object)) {
          this.mergeMolecules(p1, p2);
          return false;
        }
      }
    }
    return true;
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
    if (isZero(trajectoryUnit)) {
      trajectoryUnit = randomVector();
    }
    const molecule = newMolecule(startPos, null, null, trajectoryUnit, atom1.object, atom2.object);
    this.add(molecule);
  }

  /**
   * absorb atom1 into molecule
   * atom is removed from scene and added to molecule's Group
   */
  private addAtomToMolecule(atom: Particle, molecule: Particle) {
    this.remove(atom);
    molecule.object.attach(atom.object);

    // TODO do I need to alter the position or center of mass here?
  }

  /**
   * Combine two molecules together
   * Molecule2's Group is removed from scene, and it's children are added to molecule1
   */
  private mergeMolecules(molecule1: Particle, molecule2: Particle) {
    this.remove(molecule2);
    molecule2.object.children.forEach((c) => molecule1.object.attach(c));

    // TODO do I need to alter the position or center of mass here?
  }

  private allParticles(): Particle[] {
    return Array.from(this.particles.values());
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
