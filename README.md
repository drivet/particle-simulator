# particle-simulator

Simple particle simulator in threejs.

## To run 

* npm install
* npm start

The simulation should start in an animated state.

## Controls

OrbitControls from the threejs addon packages have been included in the
simulation, so you can use the mouse to move and zoom the camera around.

## Mouse and Keys

Pressing the left mouse button will spwan a new atom in a random location.

Pressing the right mouse button will spawn 10 new random atoms.

Pressing **p** will start and stop the animation.

Pressing the number keys will switch to different simulations.

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
