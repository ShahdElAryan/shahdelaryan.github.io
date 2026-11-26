
import {
  createSystem,
  Group,
  Mesh,
  CylinderGeometry,
  TorusGeometry,
  MeshStandardMaterial,
} from '@iwsdk/core';

export class PlatformSystem extends createSystem({}) {
  init(): void {
    const platform = this.world.getSceneObject('Platform');

    const base = new Group();
    base.name = 'Holographic Platform';

    // Dark circular base
    const baseMesh = new Mesh(
      new CylinderGeometry(0.65, 0.72, 0.10, 64),
      new MeshStandardMaterial({
        color: 0x071521,
        metalness: 0.8,
        roughness: 0.3,
      }),
    );

    baseMesh.position.y = 0.05;
    base.add(baseMesh);

    // Outer cyan ring
    const outerRing = new Mesh(
      new TorusGeometry(0.66, 0.018, 12, 96),
      new MeshStandardMaterial({
        color: 0x22D3C5,
        emissive: 0x22D3C5,
        emissiveIntensity: 2,
      }),
    );

    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.11;
    base.add(outerRing);

    // Inner cyan ring
    const innerRing = new Mesh(
      new TorusGeometry(0.43, 0.012, 12, 96),
      new MeshStandardMaterial({
        color: 0x70E6E0,
        emissive: 0x22D3C5,
        emissiveIntensity: 1.5,
      }),
    );

    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.11;
    base.add(innerRing);

    if (platform == null) {
      console.error('[Platform] Platform group not found!');
      return;
    }

    platform.add(base);

    // Initial position — we'll fine-tune it visually.
    base.position.set(0, 0, 0);

    console.log('[Platform] Holographic platform created!');
  }
}
