
import {
  createSystem,
  Group,
  Mesh,
  CylinderGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
} from '@iwsdk/core';

export class PlatformSystem extends createSystem({}) {
  private outerMaterial!: MeshStandardMaterial;
  private innerMaterial!: MeshStandardMaterial;
  private energyMaterial!: MeshBasicMaterial;
  private beamMaterial!: MeshBasicMaterial;
  private beamCoreMaterial!: MeshBasicMaterial;

  private rotatingArc!: Mesh;
  private arcPivot!: Group;
  private beamGroup!: Group;

  init(): void {
    const platform = this.world.getSceneObject('Platform');

    if (platform == null) {
      console.error('[Platform] Platform group not found!');
      return;
    }

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

    // Glowing energy surface
    this.energyMaterial = new MeshBasicMaterial({
      color: 0x22D3C5,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });

    const energyDisc = new Mesh(
      new CylinderGeometry(0.54, 0.54, 0.006, 64),
      this.energyMaterial,
    );

    energyDisc.position.y = 0.105;
    base.add(energyDisc);

    // Outer cyan ring
    this.outerMaterial = new MeshStandardMaterial({
      color: 0x22D3C5,
      emissive: 0x22D3C5,
      emissiveIntensity: 2,
      metalness: 0.3,
      roughness: 0.25,
    });

    const outerRing = new Mesh(
      new TorusGeometry(0.66, 0.018, 12, 96),
      this.outerMaterial,
    );

    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.11;
    base.add(outerRing);

    // Inner cyan ring
    this.innerMaterial = new MeshStandardMaterial({
      color: 0x70E6E0,
      emissive: 0x22D3C5,
      emissiveIntensity: 1.5,
      metalness: 0.3,
      roughness: 0.25,
    });

    const innerRing = new Mesh(
      new TorusGeometry(0.43, 0.012, 12, 96),
      this.innerMaterial,
    );

    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.11;
    base.add(innerRing);

    // Rotating partial cyan accent ring
    const arcMaterial = new MeshBasicMaterial({
      color: 0x70E6E0,
    });

    this.rotatingArc = new Mesh(
      new TorusGeometry(0.66, 0.025, 12, 96, Math.PI * 0.65),
      arcMaterial,
    );

    this.rotatingArc.rotation.x = Math.PI / 2;
    this.rotatingArc.position.y = 0.125;

    this.arcPivot = new Group();
    this.arcPivot.name = 'Rotating Arc Pivot';
    this.arcPivot.add(this.rotatingArc);
    base.add(this.arcPivot);

    // Holographic beam
    this.beamGroup = new Group();
    this.beamGroup.name = 'Holographic Light Beam';

    // Hidden until an organ is placed
    this.beamGroup.visible = false;

    this.beamMaterial = new MeshBasicMaterial({
      color: 0x22D3C5,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    });

    const beam = new Mesh(
      new CylinderGeometry(0.10, 0.28, 1.6, 48, 1, true),
      this.beamMaterial,
    );

    beam.position.y = 0.92;
    this.beamGroup.add(beam);

    // Brighter inner beam
    this.beamCoreMaterial = new MeshBasicMaterial({
      color: 0x70E6E0,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });

    const beamCore = new Mesh(
      new CylinderGeometry(0.025, 0.09, 1.55, 32, 1, true),
      this.beamCoreMaterial,
    );

    beamCore.position.y = 0.90;
    this.beamGroup.add(beamCore);

    base.add(this.beamGroup);

    platform.add(base);
    base.position.set(0, 0, 0);

    // Show beam when an organ is successfully placed
    const handleOrganSelected = () => {
      this.beamGroup.visible = true;
    };

    // Hide beam as soon as an organ is grabbed
    const handleOrganGrabbed = () => {
      this.beamGroup.visible = false;
    };

    window.addEventListener('organ-selected', handleOrganSelected);
    window.addEventListener('organ-grabbed', handleOrganGrabbed);

    this.cleanupFuncs.push(
      () => {
        window.removeEventListener(
          'organ-selected',
          handleOrganSelected,
        );

        window.removeEventListener(
          'organ-grabbed',
          handleOrganGrabbed,
        );
      },
      () => {
        base.traverse((object) => {
          if (object instanceof Mesh) {
            object.geometry.dispose();

            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      },
    );

    console.log('[Platform] Holographic platform and beam created!');
  }

  update(_delta: number, time: number): void {
    // Rotate accent around the vertical axis
    this.arcPivot.rotation.y = time * 0.7;

    // Pulse energy surface
    this.energyMaterial.opacity =
      0.16 + (Math.sin(time * 2) + 1) * 0.08;

    // Breathing effect on rings
    this.outerMaterial.emissiveIntensity =
      2.2 + Math.sin(time * 1.5) * 0.7;

    this.innerMaterial.emissiveIntensity =
      1.8 + Math.sin(time * 1.8 + 1) * 0.5;

    // Pulse holographic beam
    this.beamMaterial.opacity =
      0.09 + (Math.sin(time * 1.8) + 1) * 0.035;

    this.beamCoreMaterial.opacity =
      0.08 + (Math.sin(time * 2.2 + 1) + 1) * 0.04;
  }
}
