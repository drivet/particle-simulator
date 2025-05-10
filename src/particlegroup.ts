import { Scene, Vector3, Euler } from "three";
import { isAtomAtomBond, isAtomMoleculeBond, isMoleculeMoleculeBond } from "./bonding";
import { Enclosure } from "./enclosure";
import { newAtom, newMolecule, Particle, updateParticle } from "./particle";
import { randomEuler, randomVector, avg, cross, isZero, euler, uVec, vec } from "./utils";

/**
 * Manages all the particles in the scene
 */
export class ParticleGroup {
    private particles = new Map<string, Particle>();
    private enclosure: Enclosure;
    public pause = false;
  
    constructor(private scene: Scene) {
      // create the bounding box that we will eventually bounce off of
      this.enclosure = new Enclosure(scene, -100, 100, -100, 100, -100, 100);

      //this.spawnAtom(vec(80, 0, 0), euler(0, 0, 0), uVec(-1, 0, 0));
      //this.spawnAtom(vec(-80, 0, 5), euler(0, Math.PI, Math.PI/8), uVec(1, 0, 0));
    }

    spawnAtom(startPos: Vector3, startRot: Euler, traj: Vector3) {
      this.add(newAtom(startPos, startRot, traj));
    }
  
    spawnRandomAtoms(count?: number) {
      let actualCount = count === undefined ? 1 : count;
      for (let i = 0; i < actualCount; i++) {
        this.spawnAtom(this.enclosure.randomPos(), randomEuler(), this.randomTrajectory());
      }
    }
  
    update() {
      for (const p of this.allParticles()) {
        updateParticle(p, this.pause);
        this.enclosure.maybeBounce(p);
      }
      this.condense();
    }
  
    condense() {
      let done = false;
      while (!done) {
        done = this.maybeBond();
      }
    }
  
    private randomTrajectory(): Vector3 {
      return randomVector(-1, 1).normalize();
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
          if (p1.isAtom && p2.isAtom && isAtomAtomBond(p1.object, p2.object)) {
            this.makeNewMolecule(p1, p2);
            return false;
          } else if (p1.isAtom && !p2.isAtom && isAtomMoleculeBond(p1.object, p2.object)) {
            this.addAtomToMolecule(p1, p2);
            return false;
          } else if (!p1.isAtom && p2.isAtom && isAtomMoleculeBond(p2.object, p1.object)) {
            this.addAtomToMolecule(p2, p1);
            return false;
          } else if (!p1.isAtom && !p2.isAtom && isMoleculeMoleculeBond(p2.object, p1.object)) {
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
        trajectoryUnit = this.randomTrajectory();
      }
  
      const molecule = newMolecule(startPos, randomEuler(), trajectoryUnit, atom1.object, atom2.object);
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
      const atoms = [...molecule2.object.children];
      atoms.forEach(c => molecule1.object.attach(c));
  
      // TODO do I need to alter the position or center of mass here?
    }
  
    private allParticles(): Particle[] {
      return Array.from(this.particles.values());
    }
  }