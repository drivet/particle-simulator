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
    LineBasicMaterial,
  } from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
  import Stats from "stats.js";
  
  function boundingBox(object: Object3D) {
    const box = new Box3(new Vector3(), new Vector3());
    box.setFromObject(object);
    return box;
  }
  
  abstract class Particle {
    public object: Object3D;
  
    constructor(
      public name: string,
      public startPos: Vector3,
      public trajectoryUnit: Vector3
    ) {}
  
    update(glassBox: GlassBox) {
      this.object.rotation.x += 0.01;
      this.object.rotation.y += 0.002;
      this.object.rotation.z += 0.004;
  
      const moveBy = new Vector3();
      moveBy.copy(this.trajectoryUnit);
      moveBy.multiplyScalar(0.5);
      this.object.position.add(moveBy);
  
      // world matrix is normally updated every frame, but we need an updated
      // version *now*, after we've just updated all the geomatric parameters,
      // so calculate it here.
      this.object.updateMatrixWorld(true);
  
      const thisBox = boundingBox(this.object);
      const plane = glassBox.collision(thisBox);
      if (plane) {
        this.trajectoryUnit.reflect(plane.normal);
      }
    }
  
    abstract atoms(): Object3D[];
  }
  
  class Molecule extends Particle {
    constructor(
      public name: string,
      public startPos: Vector3,
      public trajectoryUnit: Vector3
    ) {
      super(name, startPos, trajectoryUnit);
      this.object = new Group();
      this.object.name = name;
    }
  
    atoms(): Object3D[] {
      return this.object.children;
    }
  }
  
  class SoloAtom extends Particle {
    constructor(
      public name: string,
      public startPos: Vector3,
      public trajectoryUnit: Vector3
    ) {
      super(name, startPos, trajectoryUnit);
  
      this.object = new Group();
      this.object.name = name;
  
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
      this.object.add(cubeMesh);
  
      this.addNormalLine(new Vector3(1.5, 0, 0), 0xff0000);
      this.addNormalLine(new Vector3(-1.5, 0, 0), 0xffa500);
      this.addNormalLine(new Vector3(0, 1.5, 0), 0xffff00);
      this.addNormalLine(new Vector3(0, -1.5, 0), 0x008000);
      this.addNormalLine(new Vector3(0, 0, 1.5), 0x0000ff);
      this.addNormalLine(new Vector3(0, 0, -1.5), 0x800080);
  
      this.object.scale.set(10, 10, 10);
      this.object.position.copy(this.startPos);
    }
  
    atoms(): Object3D[] {
      return [this.object];
    }
  
    private addNormalLine(n1: Vector3, color: number) {
      const n0 = new Vector3(0, 0, 0);
      const geo = new BufferGeometry().setFromPoints([n0, n1]);
      const n = new Line(geo, new LineBasicMaterial({ color }));
      this.object.add(n);
    }
  }
  
  /**
   * Manages all the particles in the scene
   */
  class ParticleGroup {
    private particles = new Map<string, Particle>();
  
    // create the bounding box that we will eventually bounce off of
    private glassBox = new GlassBox(-100, 100, -100, 100, -100, 100);
  
    constructor(private scene: Scene) {
      this.particles.set(
        "cube_00",
        new SoloAtom(
          "cube_00",
          new Vector3(20, 5, 10),
          new Vector3(1, 1, 0).normalize()
        )
      );
  
      this.particles.set(
        "cube_01",
        new SoloAtom(
          "cube_01",
          new Vector3(0, 0, 0),
          new Vector3(1, 0, 1).normalize()
        )
      );
  
      this.particles.set(
        "cube_02",
        new SoloAtom(
          "cube_02",
          new Vector3(40, 40, 40),
          new Vector3(0, 1, 1).normalize()
        )
      );
  
      this.particles.set(
        "cube_03",
        new SoloAtom(
          "cube_03",
          new Vector3(60, 60, 60),
          new Vector3(1, 1, 0).normalize()
        )
      );
  
      for (const c of this.allParticles()) {
        this.scene.add(c.object);
      }
    }
  
    update() {
      for (const c of this.allParticles()) {
        c.update(this.glassBox);
      }
    }
  
    condense() {
      const atoms: Object3D[] = [];
      for (const ps of this.allParticles()) {
        atoms.push(...ps.atoms());
      }
  
      const bondedPairs = [];
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          if (this.bondable(atoms[i], atoms[j])) {
            bondedPairs.push([atoms[i], atoms[j]]);
          }
        }
      }
  
      // consider each bonded pair
      for (const bp of bondedPairs) {
        const [atom1, atom2] = bp;
        const atom1Mol = this.molecule(atom1);
        const atom2Mol = this.molecule(atom2);
        if (atom1Mol && !atom2Mol) {
          this.addAtomToMolecule(atom2, atom1Mol);
        } else if (!atom1Mol && atom2Mol) {
          this.addAtomToMolecule(atom1, atom2Mol);
        } else if (!atom1Mol && !atom2Mol) {
          this.makeNewMolecule(atom1, atom2);
        } else if (atom1Mol && atom2Mol) {
          this.mergeMolecules(atom1Mol, atom2Mol);
        }
      }
    }
  
    /**
     * absorb atom1 into molecule
     * atom is removed from scene and added to molecule's Group
     */
    private addAtomToMolecule(atom: Object3D, molecule: Group) {
      this.scene.remove(atom);
      molecule.attach(atom);
  
      // Keep molecule's trajectory
      // TODO adjust particle map
    }
  
    /**
     * Make atom1 and atom2 into a new molecule (atom1 and atom2 go away)
     * atom1 and atom2 are removed from scene and a new Group is created with
     * atom1 and atom2 as children, which is then added to scene
     */
    private makeNewMolecule(atom1: Object3D, atom2: Object3D) {
      this.scene.remove(atom1, atom2);
      const group = new Group();
      group.attach(atom1);
      group.attach(atom2);
      this.scene.add(group);
  
      // TODO make new trajectory
      // TODO adjust particle map
    }
  
    /**
     * Combine two molecules together
     * Molecule2's Group is remove from scene, and it's children are added to molecule1
     */
    private mergeMolecules(molecule1: Group, molecule2: Group) {
      this.scene.remove(molecule2);
      molecule2.children.forEach((c) => molecule1.attach(c));
  
      // TODO adjust particle map
      // keep trajectory of surviving particle
    }
  
    private bondable(atom1: Object3D, atom2: Object3D): boolean {
      return false;
    }
  
    private molecule(atom: Object3D): Group | null {
      return atom.parent !== this.scene ? (atom.parent as Group) : null;
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
      this.camera.position.z = 500;
  
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
  