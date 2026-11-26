
import { createSystem } from '@iwsdk/core';

import {
  Mesh,
  MeshStandardMaterial,
  type Material,
} from 'three';

export class OrganGlowSystem extends createSystem({}) {
  private heart!: any;
  private lungs!: any;

  private originalMaterials = new Map<
    Mesh,
    Material | Material[]
  >();

  private glowMaterials: MeshStandardMaterial[] = [];

  init(): void {
    this.heart = this.world.getSceneObject('heart-1');
    this.lungs = this.world.getSceneObject('lungs-1');

    if (!this.heart || !this.lungs) {
      console.error('[OrganGlow] Could not find heart or lungs!');
      return;
    }

    const handleOrganSelected = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ organ: 'heart' | 'lungs' }>;

      this.clearGlow();

      const organ =
        customEvent.detail.organ === 'heart'
          ? this.heart
          : this.lungs;

      this.applyGlow(organ);

      console.log(
        `[OrganGlow] ${customEvent.detail.organ} glow activated!`,
      );
    };

    const handleOrganGrabbed = () => {
      this.clearGlow();
      console.log('[OrganGlow] Glow deactivated.');
    };

    window.addEventListener('organ-selected', handleOrganSelected);
    window.addEventListener('organ-grabbed', handleOrganGrabbed);

    this.cleanupFuncs.push(() => {
      window.removeEventListener(
        'organ-selected',
        handleOrganSelected,
      );

      window.removeEventListener(
        'organ-grabbed',
        handleOrganGrabbed,
      );

      this.clearGlow();
    });

    console.log('[OrganGlow] System ready!');
  }

  private applyGlow(root: any): void {
    root.traverse((object: any) => {
      if (!(object instanceof Mesh)) return;

      const original = object.material;
      let changed = false;

      const createGlowMaterial = (
        material: Material,
      ): Material => {
        if (!(material instanceof MeshStandardMaterial)) {
          return material;
        }

        const glow = material.clone();

        glow.emissive.set(0x22D3C5);
        glow.emissiveIntensity = 0.25;

        this.glowMaterials.push(glow);
        changed = true;

        return glow;
      };

      const replacement = Array.isArray(original)
        ? original.map(createGlowMaterial)
        : createGlowMaterial(original);

      if (changed) {
        this.originalMaterials.set(object, original);
        object.material = replacement;
      }
    });
  }

  private clearGlow(): void {
    for (const [mesh, original] of this.originalMaterials) {
      mesh.material = original;
    }

    for (const material of this.glowMaterials) {
      material.dispose();
    }

    this.originalMaterials.clear();
    this.glowMaterials = [];
  }

  update(_delta: number, time: number): void {
   const pulse =
  0.18 + (Math.sin(time * 2) + 1) * 0.08;

    for (const material of this.glowMaterials) {
      material.emissiveIntensity = pulse;
    }
  }
}
