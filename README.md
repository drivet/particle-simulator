# particle-simulator

Simple particle simulator in threejs.

## To run 

* npm install
* npm start

## To test

* npm test

The simulation should start in an animated state.

## Controls

OrbitControls from the threejs addon packages have been included in the
simulation, so you can use the mouse to move and zoom the camera around.

## Mouse and Keys

Pressing the left mouse button will spwan a new atom in a random location.

Pressing the right mouse button will spawn 10 new random atoms.

Pressing **p** will start and stop the animation.

Pressing some number keys will switch to different simulations:

 * 0 will start an empty enclosure.  Click the mouse to add some atoms.
 * 1 will spawn 100 atoms.
 * 2 will start a simulation with three groups of atoms, two of which should
   bond and the other not.
 * 3 will start an atom-molecule bonding check
 * 4 will start a molecule-molecule bonding test

## Finding your way around

I broke up the simulation into different files:

* **index.ts**: the basic threejs setup and the browser specific code.

* **enclosure.ts**: the code for the transparent box trapping the atoms.
  Wall collision code is in here.

* **particle.ts**: code for creating and spawning atoms and molecules.
  Implements the notion of a "Particle" that applies to atoms and molecules.

* **particlegroup.ts**: code that applies to all the particles at the same
  time.  Randomly spawns new atoms, and implements on pass through the
  "condensation" loop which will try and detect if any atoms or molecules
  need bonding.

* **bonding.ts**: code to try and detect if two particles should be bonded.

* **utils.ts**: utility functions for less typing.

* **box3.ts**: a very, very hackish implementation of Box3 that is the same
  as the threejs one except that we ignore any children of the Object that
  are name "line".  This is to prevent the cube normals from affecting the
  collision detection.

## Bonding conditions and general approach

We represent both atoms and molecules with a Particle interface.  The
interface will package tother ThreeJS object, as well as a rotational spin
and trajectory.

The simulation rules are:

* If two cubes meet on the same coloured side, with their normals collinear,
  then they bond, and become a molecule.
* The same rules apply to molecule-molecule and atom-molecule interactions
* If any particle hits the wall, it bounces off.

To determine if two atoms (cubes) should bond, we check:

* If their bounding boxes intersect
* For each side, for both cubes:
  * Get the normal for the side in world coordinates
  * Calculate the dot product. If it's close to -1, then the sides are
    pointed at each other or away, and they might bond.
  * Calculate the distance from a point on cube to the plane represented by
    side in question for the other cube.  If this is close to 0, then these
    sides should bond.

To determine if an atom and a molecule should bond, we check to see if their
bounding boxes intersect and if they do, we check to see if the atom can
bond with any of the atoms in the molecule.

To determine if two molecules should bond, we check to see if their bounding
boxes intersect and if they do, we check to see if any atom from one can
bond with any atom from other.

### Bonding model in ThreeJS

When two atoms bond together we will:
* Remove the atoms from Scene
* Create a new Group and **attach** the atoms to the group to preserve their
  world properties.

When an atom bonds with a molecule, we will:

* Remove the atom from the Scene.
* **Attach** (to preserve world properties) the atom to the Group
  representing the molecule.

When a molecule bonds with another molecule we will:
* Remove all the atoms from one of the molecules and **attach** them to the
  other molecule (preserving their world properties)

## Problems with the approach

* The complexity is at least n^2 in the number of atoms in the scene.

* When testing bonding with molecules and atom, or other molecules, I test
  each atom in the molecule.  Aside from its inefficiency, I don't believe
  this is the correct approach, since we're testing interior atoms as well,
  which I don't believe we want.  Unfortunately, I don't know of a way
  around this as of yet - possibly ray tracing? Not sure.
