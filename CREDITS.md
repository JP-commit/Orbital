# Credits & Attributions: Orbital – Space Survival

## 🛠️ Design & Development
- **Game Design & Engineering**: Antigravity AI Engineering Team
- **Physics & Engine Architecture**: Fixed-timestep 60Hz accumulator loop, 2D Uniform Spatial Hash broadphase collision grid, and zero-allocation object pools.
- **RNG Algorithm**: 32-bit deterministic `Mulberry32` pseudo-random number generator.

## 🎨 Visuals & Rendering
- **Art Direction**: 100% vector-based immediate mode Canvas 2D graphics rendered directly in code.
- **Zero External Art Dependencies**: Spaceships, asteroid polygons, laser beams, glowing particle trails, boss carapaces, nebulae, and starfields are generated algorithmically.

## 🎵 Audio Synthesizer & Music
- **Sound Architecture**: 100% procedural Web Audio API audio synthesis.
- **Zero External Audio Assets**:
  - Thruster noise generated via real-time pink noise buffer filtering.
  - Blaster, laser, missile, and explosion sound effects synthesized via frequency-modulated `OscillatorNode`, `BiquadFilterNode`, and `GainNode` sweeps.
  - Dynamic ambient space synth background soundtrack generated procedurally in minor keys using layered melodic arpeggiators and sub-bass drones.
