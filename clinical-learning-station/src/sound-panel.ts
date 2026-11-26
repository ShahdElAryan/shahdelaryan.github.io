
import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

import {
  createSystem,
  RayInteractable,
} from '@iwsdk/core';

type OrganName = 'heart' | 'lungs';

export class SoundPanelSystem extends createSystem({}) {
  private panel!: Mesh;
  private playButton!: Mesh;

  private readonly volumeTargets: Mesh[] = [];
  private readonly volumeClickHandlers: (() => void)[] = [];

  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private texture!: CanvasTexture;
  private material!: MeshBasicMaterial;

  private buttonCanvas!: HTMLCanvasElement;
  private buttonContext!: CanvasRenderingContext2D;
  private buttonTexture!: CanvasTexture;
  private buttonMaterial!: MeshBasicMaterial;

  private heartAudio!: HTMLAudioElement;
  private lungsAudio!: HTMLAudioElement;

  private currentOrgan: OrganName | null = null;
  private isPlaying = false;
  private volume = 0.6;
  private waveformTime = 0;
  private redrawTimer = 0;

  private readonly panelWidth = 2.8;
  private readonly panelHeight = 0.7;

  private readonly volumeStartX = 1130;
  private readonly volumeStep = 40;

  init(): void {
    console.log('[SoundPanel] Initializing...');

    const displayRoot =
      this.world.getSceneObject('HolographicDisplays');

    if (!displayRoot) {
      throw new Error(
        '[SoundPanel] Could not find HolographicDisplays in the scene.',
      );
    }

    // Audio
    this.heartAudio = new Audio('/audio/heartbeat.mp3');
    this.lungsAudio = new Audio('/audio/breathing.mp3');

    this.heartAudio.loop = true;
    this.lungsAudio.loop = true;

    this.heartAudio.preload = 'auto';
    this.lungsAudio.preload = 'auto';

    this.heartAudio.volume = this.volume;
    this.lungsAudio.volume = this.volume;

    // ==========================================
    // MAIN PANEL
    // ==========================================

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1600;
    this.canvas.height = 400;

    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('[SoundPanel] Could not create canvas context');
    }

    this.context = context;

    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;

    this.material = new MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
    });

    this.panel = new Mesh(
      new PlaneGeometry(this.panelWidth, this.panelHeight),
      this.material,
    );

    this.panel.position.set(0, 1.95, -1.75);

    displayRoot.add(this.panel);
    this.panel.visible = false;

    // Big panel remains ray-interactable, but has no focus listener.
    this.world
      .createTransformEntity(this.panel)
      .addComponent(RayInteractable);

    // ==========================================
    // SMALL PLAY BUTTON PANEL
    // ==========================================

    this.buttonCanvas = document.createElement('canvas');
    this.buttonCanvas.width = 256;
    this.buttonCanvas.height = 256;

    const buttonContext = this.buttonCanvas.getContext('2d');

    if (!buttonContext) {
      throw new Error('[SoundPanel] Could not create play button canvas');
    }

    this.buttonContext = buttonContext;

    this.buttonTexture = new CanvasTexture(this.buttonCanvas);
    this.buttonTexture.colorSpace = SRGBColorSpace;

    this.buttonMaterial = new MeshBasicMaterial({
      map: this.buttonTexture,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
    });

    this.playButton = new Mesh(
      new PlaneGeometry(0.42, 0.42),
      this.buttonMaterial,
    );

    const playX =
      (335 / 1600 - 0.5) * this.panelWidth;

    const playY =
      (0.5 - 200 / 400) * this.panelHeight;

    this.playButton.position.set(
      playX,
      1.95 + playY,
      -1.75 + 0.025,
    );

    this.playButton.renderOrder = 30;

    displayRoot.add(this.playButton);
    this.playButton.visible = false;

    this.world
      .createTransformEntity(this.playButton)
      .addComponent(RayInteractable);

    const handlePlayClick = () => {
      console.log('[SoundPanel] Play button clicked');
      this.togglePlayback();
    };

    this.playButton.addEventListener(
      'click',
      handlePlayClick,
    );

    // ==========================================
    // SMALL VOLUME SLIDER PANELS
    // ==========================================

    for (let i = 0; i < 10; i++) {
      // Center of the corresponding volume segment
      const pixelX =
        this.volumeStartX + i * this.volumeStep + 17;

      const pixelY = 200;

      // Convert canvas coordinates into world coordinates
      const targetX =
        (pixelX / 1600 - 0.5) * this.panelWidth;

      const targetY =
        (0.5 - pixelY / 400) * this.panelHeight;

      // Invisible clickable panel over the volume segment
      const target = new Mesh(
        new PlaneGeometry(0.066, 0.14),
        new MeshBasicMaterial({
          color: 0x22D3C5,
          transparent: true,
          opacity: 0,
          side: DoubleSide,
          depthWrite: false,
        }),
      );

      target.position.set(
        targetX,
        1.95 + targetY,
        -1.75 + 0.03,
      );

      target.renderOrder = 31;
      target.visible = false;

      displayRoot.add(target);

      // Register this segment independently with IWSDK
      this.world
        .createTransformEntity(target)
        .addComponent(RayInteractable);

      // Each segment sets its own volume level
      const handleVolumeClick = () => {
        const newVolume = (i + 1) / 10;

        console.log(
          `[SoundPanel] Volume segment ${i + 1} clicked:`,
          newVolume,
        );

        this.setVolume(newVolume);
      };

      target.addEventListener(
        'click',
        handleVolumeClick,
      );

      this.volumeTargets.push(target);
      this.volumeClickHandlers.push(handleVolumeClick);
    }

    // ==========================================
    // ORGAN EVENTS
    // ==========================================

    const handleOrganSelected = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ organ: OrganName }>;

      this.stopPlayback();

      this.currentOrgan = customEvent.detail.organ;

      this.panel.visible = true;
      this.playButton.visible = true;

      for (const target of this.volumeTargets) {
        target.visible = true;
      }

      this.drawPanel();
      this.drawPlayButton();

      console.log(
        '[SoundPanel] Selected:',
        this.currentOrgan,
      );
    };

    const handleOrganGrabbed = () => {
      this.stopPlayback();

      this.currentOrgan = null;

      this.panel.visible = false;
      this.playButton.visible = false;

      for (const target of this.volumeTargets) {
        target.visible = false;
      }
    };

    window.addEventListener(
      'organ-selected',
      handleOrganSelected,
    );

    window.addEventListener(
      'organ-grabbed',
      handleOrganGrabbed,
    );

    // ==========================================
    // CLEANUP
    // ==========================================

    this.cleanupFuncs.push(
      () => {
        this.playButton.removeEventListener(
          'click',
          handlePlayClick,
        );
      },

      () => {
        window.removeEventListener(
          'organ-selected',
          handleOrganSelected,
        );
      },

      () => {
        window.removeEventListener(
          'organ-grabbed',
          handleOrganGrabbed,
        );
      },

      () => {
        this.stopPlayback();

        this.heartAudio.src = '';
        this.lungsAudio.src = '';

        displayRoot.remove(this.panel);
        displayRoot.remove(this.playButton);

        this.panel.geometry.dispose();
        this.material.dispose();
        this.texture.dispose();

        this.playButton.geometry.dispose();
        this.buttonMaterial.dispose();
        this.buttonTexture.dispose();

        for (let i = 0; i < this.volumeTargets.length; i++) {
          const target = this.volumeTargets[i];

          target.removeEventListener(
            'click',
            this.volumeClickHandlers[i],
          );

          displayRoot.remove(target);

          target.geometry.dispose();

          (target.material as MeshBasicMaterial).dispose();
        }

        this.volumeTargets.length = 0;
        this.volumeClickHandlers.length = 0;
      },
    );

    this.drawPanel();
    this.drawPlayButton();

    console.log('[SoundPanel] System initialized successfully');
  }

  update(delta: number): void {
    if (!this.panel.visible || !this.currentOrgan) return;

    if (this.isPlaying) {
      this.waveformTime += delta;
      this.redrawTimer += delta;

      if (this.redrawTimer >= 0.067) {
        this.redrawTimer = 0;
        this.drawPanel();
      }
    }
  }

  // ==========================================
  // AUDIO
  // ==========================================

  private getCurrentAudio(): HTMLAudioElement | null {
    if (this.currentOrgan === 'heart') {
      return this.heartAudio;
    }

    if (this.currentOrgan === 'lungs') {
      return this.lungsAudio;
    }

    return null;
  }

  private togglePlayback(): void {
    const audio = this.getCurrentAudio();

    if (!audio) return;

    if (this.isPlaying) {
      audio.pause();
      this.isPlaying = false;

      this.drawPanel();
      this.drawPlayButton();

      return;
    }

    audio.volume = this.volume;

    audio.play()
      .then(() => {
        this.isPlaying = true;

        this.drawPanel();
        this.drawPlayButton();
      })
      .catch((error) => {
        this.isPlaying = false;

        console.error(
          '[SoundPanel] Could not play audio:',
          error,
        );

        this.drawPanel();
        this.drawPlayButton();
      });
  }

  private stopPlayback(): void {
    this.heartAudio?.pause();
    this.lungsAudio?.pause();

    if (this.heartAudio) {
      this.heartAudio.currentTime = 0;
    }

    if (this.lungsAudio) {
      this.lungsAudio.currentTime = 0;
    }

    this.isPlaying = false;
    this.waveformTime = 0;
    this.redrawTimer = 0;

    if (this.context) {
      this.drawPanel();
    }

    if (this.buttonContext) {
      this.drawPlayButton();
    }
  }

  private setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));

    this.heartAudio.volume = this.volume;
    this.lungsAudio.volume = this.volume;

    this.drawPanel();

    console.log(
      '[SoundPanel] Volume updated:',
      Math.round(this.volume * 100) + '%',
    );
  }

  // ==========================================
  // MAIN PANEL DRAWING
  // ==========================================

  private drawPanel(): void {
    const ctx = this.context;

    ctx.clearRect(0, 0, 1600, 400);

    // Background
    ctx.fillStyle = 'rgba(7, 21, 33, 0.97)';
    ctx.fillRect(0, 0, 1600, 400);

    // Outer border
    ctx.strokeStyle = '#22D3C5';
    ctx.lineWidth = 7;
    ctx.strokeRect(12, 12, 1576, 376);

    // Inner border
    ctx.strokeStyle = 'rgba(112, 230, 224, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, 1544, 344);

    // Organ icon
    this.drawOrganIcon(ctx);

    // Original play button artwork
    ctx.beginPath();
    ctx.arc(335, 200, 55, 0, Math.PI * 2);

    ctx.fillStyle = 'rgba(34, 211, 197, 0.13)';
    ctx.fill();

    ctx.strokeStyle = '#22D3C5';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#70E6E0';

    if (this.isPlaying) {
      ctx.fillRect(318, 174, 12, 52);
      ctx.fillRect(342, 174, 12, 52);
    } else {
      ctx.beginPath();
      ctx.moveTo(320, 170);
      ctx.lineTo(320, 230);
      ctx.lineTo(365, 200);
      ctx.closePath();
      ctx.fill();
    }

    // Organ title
    ctx.fillStyle = '#70E6E0';
    ctx.font = 'bold 38px Arial';

    ctx.fillText(
      this.currentOrgan === 'heart'
        ? 'HEARTBEAT'
        : 'BREATHING',
      440,
      155,
    );

    ctx.fillStyle = 'rgba(231, 244, 243, 0.65)';
    ctx.font = '24px Arial';

    ctx.fillText(
      this.isPlaying ? 'NOW PLAYING' : 'AUDIO EXPERIENCE',
      440,
      205,
    );

    // Waveform
    this.drawWaveform(ctx);

    // Volume title
    ctx.fillStyle = '#70E6E0';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('VOL', 1115, 145);

    // Volume segments
    for (let i = 0; i < 10; i++) {
      const x = this.volumeStartX + i * this.volumeStep;

      const active =
        i < Math.round(this.volume * 10);

      ctx.fillStyle = active
        ? '#22D3C5'
        : 'rgba(112, 230, 224, 0.18)';

      ctx.fillRect(x, 185, 34, 30);
    }

    // Volume percentage
    ctx.fillStyle = 'rgba(231, 244, 243, 0.75)';
    ctx.font = '22px Arial';

    ctx.fillText(
      `${Math.round(this.volume * 100)}%`,
      1540,
      205,
    );

    // Footer
    ctx.fillStyle = 'rgba(112, 230, 224, 0.65)';
    ctx.font = '19px Arial';

    ctx.fillText(
      'ANATOMY EXPLORATION STATION',
      60,
      355,
    );

    this.texture.needsUpdate = true;
  }

  // ==========================================
  // SMALL PLAY BUTTON DRAWING
  // ==========================================

  private drawPlayButton(): void {
    const ctx = this.buttonContext;

    //ctx.clearRect(0, 0, 256, 256);

    //ctx.beginPath();
    //ctx.arc(128, 128, 108, 0, Math.PI * 2);

    //ctx.fillStyle = 'rgba(7, 21, 33, 0.08)';
    //ctx.fill();

    ctx.strokeStyle = '#70E6E0';
    ctx.lineWidth = 5;
    //ctx.stroke();

    ctx.fillStyle = '#70E6E0';

    if (this.isPlaying) {
      //ctx.fillRect(91, 78, 24, 100);
      //ctx.fillRect(141, 78, 24, 100);
    } else {
      //ctx.beginPath();
      //ctx.moveTo(105, 70);
      //ctx.lineTo(105, 186);
      //ctx.lineTo(180, 128);
      //ctx.closePath();
      //ctx.fill();
    }

    //this.buttonTexture.needsUpdate = true;
  }

  // ==========================================
  // ORGAN ICON
  // ==========================================

  private drawOrganIcon(
    ctx: CanvasRenderingContext2D,
  ): void {
    ctx.save();

    ctx.strokeStyle = '#70E6E0';
    ctx.fillStyle = 'rgba(34, 211, 197, 0.12)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.currentOrgan === 'heart') {
      ctx.beginPath();

      ctx.moveTo(145, 145);
      ctx.bezierCurveTo(80, 90, 65, 185, 145, 260);
      ctx.bezierCurveTo(225, 185, 210, 90, 145, 145);

      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(95, 190);
      ctx.lineTo(125, 190);
      ctx.lineTo(140, 165);
      ctx.lineTo(157, 220);
      ctx.lineTo(175, 190);
      ctx.lineTo(195, 190);

      ctx.stroke();
    } else {
      ctx.beginPath();

      ctx.moveTo(145, 125);
      ctx.lineTo(145, 180);

      ctx.moveTo(145, 155);
      ctx.bezierCurveTo(120, 125, 105, 145, 90, 180);
      ctx.bezierCurveTo(65, 245, 100, 275, 135, 240);
      ctx.lineTo(145, 195);

      ctx.moveTo(145, 155);
      ctx.bezierCurveTo(170, 125, 185, 145, 200, 180);
      ctx.bezierCurveTo(225, 245, 190, 275, 155, 240);
      ctx.lineTo(145, 195);

      ctx.stroke();
    }

    ctx.restore();
  }

  // ==========================================
  // WAVEFORM
  // ==========================================

  private drawWaveform(
    ctx: CanvasRenderingContext2D,
  ): void {
    const startX = 650;
    const endX = 1060;
    const centerY = 200;

    const barCount = 40;
    const spacing = (endX - startX) / barCount;

    for (let i = 0; i < barCount; i++) {
      let amplitude: number;

      if (this.isPlaying) {
        const waveA = Math.sin(
          i * 0.55 + this.waveformTime * 5,
        );

        const waveB = Math.sin(
          i * 0.19 - this.waveformTime * 3,
        );

        amplitude =
          13 + Math.abs(waveA * waveB) * 85;
      } else {
        amplitude =
          8 + Math.abs(Math.sin(i * 0.6)) * 9;
      }

      ctx.fillStyle = this.isPlaying
        ? '#22D3C5'
        : 'rgba(112, 230, 224, 0.4)';

      ctx.fillRect(
        startX + i * spacing,
        centerY - amplitude / 2,
        5,
        amplitude,
      );
    }
  }
}
