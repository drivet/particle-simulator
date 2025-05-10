import {
  Scene,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  OrthographicCamera,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import { ParticleGroup } from "./particlegroup";

class Main {
  scene: Scene;
  camera: PerspectiveCamera | OrthographicCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls;
  stats: Stats;
  particleGroup: ParticleGroup;

  private animating: boolean;

  constructor() {
    this.initViewport();
  }

  /** Initialize the viewport */
  private initViewport() {
    // Init scene.
    this.scene = new Scene();
    this.scene.background = new Color("#191919");

    // Init camera.
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new PerspectiveCamera(50, aspect, 1, 1000);
    this.camera.position.z = 350;

    // Init renderer.
    this.renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera);
    
    this.startAnimating();
    
    document.body.appendChild(this.renderer.domElement);
    window.addEventListener("resize", () => this.onResize());

    // Init stats.
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);

    // Init orbit controls.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.update();
    this.controls.addEventListener("change", () => this.render());

    // create the particle group which runs our whole simualation
    this.particleGroup = new ParticleGroup(this.scene);
    this.particleGroup.spawnRandomAtoms(100);

    this.setupEvents();
    
    this.render();
  }

  private setupEvents() {
    window.addEventListener("mouseup", (e) => {
      switch(e.button) {
        case 2:
          this.particleGroup.spawnRandomAtoms(10);
          break;
        case 0:
          this.particleGroup.spawnRandomAtoms();
          break;
      }
     
    });

    window.addEventListener("keypress", e => {
      if (e.key === 'p') {
        if (this.animating) {
          this.stopAnimating();
        } else {
          this.startAnimating();
        }
      } else if (e.key === '0') {
        this.particleGroup.clear();
      } else if (e.key === '1') {
        this.particleGroup.clear()
        this.particleGroup.spawnRandomAtoms(100);
      } else if (e.key === '2') {
        this.particleGroup.clear();
        this.particleGroup.spawnAtomCheck();
      }
    });

  }

  private startAnimating() {
    this.animating = true;
    this.renderer.setAnimationLoop(() => this.animate());
  }

  private stopAnimating() {
    this.animating = false;
    this.renderer.setAnimationLoop(null);
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
