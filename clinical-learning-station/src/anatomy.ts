
import { createSystem, Object3D, Vector3 } from '@iwsdk/core';

export class AnatomySystem extends createSystem({}) {
  private torso!: Object3D;
  private heart!: Object3D;
  private lungs!: Object3D;
  private platform!: Object3D;

  private elapsed = 0;
  private started = false;
  private organsSeparated = false;

  private torsoStartX = 0;
  private torsoStartZ = 0;
  private heartStartX = 0;
  private lungsStartX = 0;
  private heartStartZ = 0;
  private lungsStartZ = 0;

  private heartRotation = new Vector3();
  private lungsRotation = new Vector3();

  private heartOriginalScale = new Vector3();
  private lungsOriginalScale = new Vector3();

  private heartSnapStartScale = new Vector3();
  private heartTargetScale = new Vector3();
  private lungsSnapStartScale = new Vector3();
  private lungsTargetScale = new Vector3();

  private heartReturnStartScale = new Vector3();
  private lungsReturnStartScale = new Vector3();

  private heartDisplayPosition = new Vector3();
  private lungsDisplayPosition = new Vector3();
  private displayPositionsReady = false;

  private activeOrgan: 'heart' | 'lungs' | null = null;

  private heartSnapStart = new Vector3();
  private heartSnapTarget = new Vector3();
  private heartSnapElapsed = 0;
  private heartIsSnapping = false;
  private heartIsPlaced = false;

  private lungsSnapStart = new Vector3();
  private lungsSnapTarget = new Vector3();
  private lungsSnapElapsed = 0;
  private lungsIsSnapping = false;
  private lungsIsPlaced = false;

  private heartReturnStart = new Vector3();
  private heartReturnElapsed = 0;
  private heartIsReturning = false;

  private lungsReturnStart = new Vector3();
  private lungsReturnElapsed = 0;
  private lungsIsReturning = false;

  init(): void {
    // Get scene objects and verify that all four exist.
    const torso = this.world.getSceneObject('torso-1');
    const heart = this.world.getSceneObject('heart-1');
    const lungs = this.world.getSceneObject('lungs-1');
    const platform = this.world.getSceneObject('Platform');

    if (!torso || !heart || !lungs || !platform) {
      throw new Error(
        '[Anatomy] Could not find one or more required scene objects: ' +
        'torso-1, heart-1, lungs-1, Platform.',
      );
    }

    this.torso = torso;
    this.heart = heart;
    this.lungs = lungs;
    this.platform = platform;

    this.torsoStartX = this.torso.position.x;
    this.torsoStartZ = this.torso.position.z;

    this.heartStartX = this.heart.position.x;
    this.lungsStartX = this.lungs.position.x;
    this.heartStartZ = this.heart.position.z;
    this.lungsStartZ = this.lungs.position.z;

    this.heartOriginalScale.copy(this.heart.scale);
    this.lungsOriginalScale.copy(this.lungs.scale);

    this.heartRotation.set(
      this.heart.rotation.x,
      this.heart.rotation.y,
      this.heart.rotation.z,
    );

    this.lungsRotation.set(
      this.lungs.rotation.x,
      this.lungs.rotation.y,
      this.lungs.rotation.z,
    );

    const startAnimation = () => {
      this.started = true;
      console.log('[Anatomy] Exploration started!');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b') {
        startAnimation();
      }
    };

    const handleHeartGrab = () => {
      window.dispatchEvent(new Event('organ-grabbed'));

      this.heartIsPlaced = false;
      this.heartIsSnapping = false;
      this.heartIsReturning = false;

      this.heart.scale.copy(this.heartOriginalScale);

      if (this.activeOrgan === 'heart') {
        this.activeOrgan = null;
      }

      if (this.lungsIsPlaced || this.lungsIsSnapping) {
        this.startLungsReturn();
      }
    };

    const handleLungsGrab = () => {
      window.dispatchEvent(new Event('organ-grabbed'));

      this.lungsIsPlaced = false;
      this.lungsIsSnapping = false;
      this.lungsIsReturning = false;

      this.lungs.scale.copy(this.lungsOriginalScale);

      if (this.activeOrgan === 'lungs') {
        this.activeOrgan = null;
      }

      if (this.heartIsPlaced || this.heartIsSnapping) {
        this.startHeartReturn();
      }
    };

    const handleHeartRelease = () => {
      this.trySnapOrgan(this.heart);
    };

    const handleLungsRelease = () => {
      this.trySnapOrgan(this.lungs);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('start-anatomy-experience', startAnimation);

    this.heart.addEventListener('pointerdown', handleHeartGrab);
    this.lungs.addEventListener('pointerdown', handleLungsGrab);

    this.heart.addEventListener('pointerup', handleHeartRelease);
    this.lungs.addEventListener('pointerup', handleLungsRelease);

    this.cleanupFuncs.push(
      () => window.removeEventListener('keydown', handleKeyDown),
      () => window.removeEventListener(
        'start-anatomy-experience',
        startAnimation,
      ),
      () => this.heart.removeEventListener(
        'pointerdown',
        handleHeartGrab,
      ),
      () => this.lungs.removeEventListener(
        'pointerdown',
        handleLungsGrab,
      ),
      () => this.heart.removeEventListener(
        'pointerup',
        handleHeartRelease,
      ),
      () => this.lungs.removeEventListener(
        'pointerup',
        handleLungsRelease,
      ),
    );

    console.log('[Anatomy] Systems ready!');
  }

  private startHeartReturn(): void {
    this.heartIsPlaced = false;
    this.heartIsSnapping = false;
    this.heartReturnStart.copy(this.heart.position);
    this.heartReturnStartScale.copy(this.heart.scale);
    this.heartReturnElapsed = 0;
    this.heartIsReturning = true;

    this.heart.rotation.set(
      this.heartRotation.x,
      this.heartRotation.y,
      this.heartRotation.z,
    );

    this.activeOrgan = null;
  }

  private startLungsReturn(): void {
    this.lungsIsPlaced = false;
    this.lungsIsSnapping = false;
    this.lungsReturnStart.copy(this.lungs.position);
    this.lungsReturnStartScale.copy(this.lungs.scale);
    this.lungsReturnElapsed = 0;
    this.lungsIsReturning = true;

    this.lungs.rotation.set(
      this.lungsRotation.x,
      this.lungsRotation.y,
      this.lungsRotation.z,
    );

    this.activeOrgan = null;
  }

  private trySnapOrgan(organ: Object3D): void {
    const organWorld = new Vector3();
    const platformWorld = new Vector3();

    organ.updateWorldMatrix(true, false);
    this.platform.updateWorldMatrix(true, false);

    organ.getWorldPosition(organWorld);
    this.platform.getWorldPosition(platformWorld);

    const dx = Math.abs(organWorld.x - platformWorld.x);
    const dy = Math.abs(organWorld.y - platformWorld.y);
    const dz = Math.abs(organWorld.z - platformWorld.z);

    const insideSnapZone =
      dx <= 1.1 &&
      dy <= 0.9 &&
      dz <= 1.1;

    if (!insideSnapZone) {
      console.log('[Anatomy] Outside snap zone.');
      return;
    }

    if (organ.parent == null) return;

    const targetWorld = platformWorld.clone();
    targetWorld.y += 0.45;

    organ.parent.updateWorldMatrix(true, false);
    organ.parent.worldToLocal(targetWorld);

    if (organ === this.heart) {
      this.heartSnapStart.copy(organ.position);
      this.heartSnapTarget.copy(targetWorld);
      this.heartSnapElapsed = 0;
      this.heartIsSnapping = true;
      this.heartIsPlaced = false;

      this.heartSnapStartScale.copy(this.heart.scale);
      this.heartTargetScale
        .copy(this.heartOriginalScale)
        .multiplyScalar(4.0);

      this.heart.rotation.set(
        this.heartRotation.x,
        this.heartRotation.y,
        this.heartRotation.z,
      );

      this.activeOrgan = 'heart';

      console.log('[Anatomy] Heart accepted!');
    } else if (organ === this.lungs) {
      this.lungsSnapStart.copy(organ.position);
      this.lungsSnapTarget.copy(targetWorld);
      this.lungsSnapElapsed = 0;
      this.lungsIsSnapping = true;
      this.lungsIsPlaced = false;

      this.lungsSnapStartScale.copy(this.lungs.scale);
      this.lungsTargetScale
        .copy(this.lungsOriginalScale)
        .multiplyScalar(1.5);

      this.lungs.rotation.set(
        this.lungsRotation.x,
        this.lungsRotation.y,
        this.lungsRotation.z,
      );

      this.activeOrgan = 'lungs';

      console.log('[Anatomy] Lungs accepted!');
    }
  }

  update(delta: number): void {
    if (!this.started) return;

    this.elapsed += delta;

    // Phase 1: Reveal organs
    if (this.elapsed <= 5.3) {
      const organProgress = Math.max(
        0,
        Math.min((this.elapsed - 0.6) / 2, 1),
      );

      const organEased =
        organProgress * organProgress * (3 - 2 * organProgress);

      this.heart.position.z =
        this.heartStartZ + 0.95 * organEased;

      this.lungs.position.z =
        this.lungsStartZ + 0.95 * organEased;

      // Phase 2: Move torso aside
      const torsoProgress = Math.max(
        0,
        Math.min((this.elapsed - 2.6) / 1.5, 1),
      );

      const torsoEased =
        torsoProgress * torsoProgress * (3 - 2 * torsoProgress);

      this.torso.position.x =
        this.torsoStartX - 0.95 * torsoEased;

      this.torso.position.z =
        this.torsoStartZ - 0.85 * torsoEased;

      // Phase 3: Separate organs
      const splitProgress = Math.max(
        0,
        Math.min((this.elapsed - 4.1) / 1.2, 1),
      );

      const splitEased =
        splitProgress * splitProgress * (3 - 2 * splitProgress);

      this.lungs.position.x =
        this.lungsStartX - 0.55 * splitEased;

      this.heart.position.x =
        this.heartStartX + 0.55 * splitEased;

      if (splitProgress >= 1) {
        this.organsSeparated = true;
      }
    }

    // Save final display positions once the reveal ends
    if (this.elapsed >= 5.3 && !this.displayPositionsReady) {
      this.heartDisplayPosition.copy(this.heart.position);
      this.lungsDisplayPosition.copy(this.lungs.position);
      this.displayPositionsReady = true;
    }

    // Heart snapping and scaling
    if (this.heartIsSnapping) {
      this.heartSnapElapsed += delta;

      const progress = Math.min(this.heartSnapElapsed / 0.8, 1);
      const eased = progress * progress * (3 - 2 * progress);

      this.heart.position.lerpVectors(
        this.heartSnapStart,
        this.heartSnapTarget,
        eased,
      );

      this.heart.scale.lerpVectors(
        this.heartSnapStartScale,
        this.heartTargetScale,
        eased,
      );

      if (progress >= 1) {
        this.heartIsSnapping = false;
        this.heartIsPlaced = true;

        window.dispatchEvent(
          new CustomEvent('organ-selected', {
            detail: { organ: 'heart' },
          }),
        );

        console.log('[Anatomy] Heart placed!');
      }
    }

    // Lungs snapping and scaling
    if (this.lungsIsSnapping) {
      this.lungsSnapElapsed += delta;

      const progress = Math.min(this.lungsSnapElapsed / 0.8, 1);
      const eased = progress * progress * (3 - 2 * progress);

      this.lungs.position.lerpVectors(
        this.lungsSnapStart,
        this.lungsSnapTarget,
        eased,
      );

      this.lungs.scale.lerpVectors(
        this.lungsSnapStartScale,
        this.lungsTargetScale,
        eased,
      );

      if (progress >= 1) {
        this.lungsIsSnapping = false;
        this.lungsIsPlaced = true;

        window.dispatchEvent(
          new CustomEvent('organ-selected', {
            detail: { organ: 'lungs' },
          }),
        );

        console.log('[Anatomy] Lungs placed!');
      }
    }

    // Heart returning to display position and original size
    if (this.heartIsReturning) {
      this.heartReturnElapsed += delta;

      const progress = Math.min(this.heartReturnElapsed / 0.7, 1);
      const eased = progress * progress * (3 - 2 * progress);

      this.heart.position.lerpVectors(
        this.heartReturnStart,
        this.heartDisplayPosition,
        eased,
      );

      this.heart.scale.lerpVectors(
        this.heartReturnStartScale,
        this.heartOriginalScale,
        eased,
      );

      if (progress >= 1) {
        this.heartIsReturning = false;
      }
    }

    // Lungs returning to display position and original size
    if (this.lungsIsReturning) {
      this.lungsReturnElapsed += delta;

      const progress = Math.min(this.lungsReturnElapsed / 0.7, 1);
      const eased = progress * progress * (3 - 2 * progress);

      this.lungs.position.lerpVectors(
        this.lungsReturnStart,
        this.lungsDisplayPosition,
        eased,
      );

      this.lungs.scale.lerpVectors(
        this.lungsReturnStartScale,
        this.lungsOriginalScale,
        eased,
      );

      if (progress >= 1) {
        this.lungsIsReturning = false;
      }
    }

    // Rotate only the active organ on the platform
    if (this.activeOrgan === 'heart' && this.heartIsPlaced) {
      this.heart.rotation.y += delta * 0.5;
    }

    if (this.activeOrgan === 'lungs' && this.lungsIsPlaced) {
      this.lungs.rotation.y += delta * 0.5;
    }
  }
}
