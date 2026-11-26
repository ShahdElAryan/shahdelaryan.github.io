
import {
  createSystem,
  Group,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
} from '@iwsdk/core';

type FloatingParticle = {
  mesh: Mesh;
  baseY: number;
  phase: number;
  speed: number;
};

export class EffectsSystem extends createSystem({}) {
  private particles: FloatingParticle[] = [];

  init(): void {
    const visualEffects = this.world.getSceneObject('VisualEffects');

    if (visualEffects == null) {
      console.error('[Effects] VisualEffects object not found!');
      return;
    }

    const particleGroup = new Group();
    particleGroup.name = 'Ambient Holographic Particles';

    // Center the particle field around the entire experience
    particleGroup.position.set(0, 0.5, -2.2);

    visualEffects.add(particleGroup);

    const geometry = new SphereGeometry(1, 8, 8);

    const material = new MeshBasicMaterial({
      color: 0x22D3C5,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const particleCount = 90;

    // Wider 3D area surrounding the experience
    const radiusX = 2.8;
    const radiusZ = 2.0;
    const heightRange = 3.0;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random());

      const x = Math.cos(angle) * radius * radiusX;
      const z = Math.sin(angle) * radius * radiusZ;
      const height = (Math.random() - 0.5) * heightRange;

      const size = 0.006 + Math.random() * 0.012;

      const particle = new Mesh(geometry, material);

      particle.scale.setScalar(size);
      particle.position.set(x, height, z);

      particleGroup.add(particle);

      this.particles.push({
        mesh: particle,
        baseY: height,
        phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.3,
      });
    }

    this.cleanupFuncs.push(() => {
      visualEffects.remove(particleGroup);
      geometry.dispose();
      material.dispose();
      this.particles = [];
    });

    console.log('[Effects] Ambient particle atmosphere created!');
  }

  update(_delta: number, time: number): void {
    for (const particle of this.particles) {
      particle.mesh.position.y =
        particle.baseY +
        Math.sin(time * particle.speed + particle.phase) * 0.08;
    }
  }
}
