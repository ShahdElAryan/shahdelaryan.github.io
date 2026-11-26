
import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

import {
  createSystem,
  Object3D,
  RayInteractable,
} from '@iwsdk/core';

type OrganName = 'heart' | 'lungs';

type PanelHome = {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
};

export class HolographicDisplaysSystem extends createSystem({}) {
  private displayRoot!: Object3D;

  private leftCanvas!: HTMLCanvasElement;
  private rightCanvas!: HTMLCanvasElement;

  private leftTexture!: CanvasTexture;
  private rightTexture!: CanvasTexture;

  private leftMaterial!: MeshBasicMaterial;
  private rightMaterial!: MeshBasicMaterial;

  private leftPanel!: Mesh;
  private rightPanel!: Mesh;

  private focusedPanel: Mesh | null = null;
  private panelHomes = new Map<Mesh, PanelHome>();

  private readonly focusPosition = new Vector3(0, 1.2, -1.35);
  private readonly focusScale = new Vector3(1.45, 1.45, 1.45);

  private heartImage!: HTMLImageElement;
  private lungsImage!: HTMLImageElement;

  private currentOrgan: OrganName | null = null;

  init(): void {
    const displayRoot =
      this.world.getSceneObject('HolographicDisplays');

    if (!displayRoot) {
      throw new Error(
        '[HolographicDisplays] Could not find HolographicDisplays in the scene.',
      );
    }

    this.displayRoot = displayRoot;

    this.leftCanvas = this.createCanvas();
    this.rightCanvas = this.createCanvas();

    this.leftTexture = new CanvasTexture(this.leftCanvas);
    this.rightTexture = new CanvasTexture(this.rightCanvas);

    this.leftTexture.colorSpace = SRGBColorSpace;
    this.rightTexture.colorSpace = SRGBColorSpace;

    this.leftMaterial = this.createMaterial(this.leftTexture);
    this.rightMaterial = this.createMaterial(this.rightTexture);

    this.leftPanel = new Mesh(
      new PlaneGeometry(1.25, 1.4),
      this.leftMaterial,
    );

    this.rightPanel = new Mesh(
      new PlaneGeometry(1.25, 1.4),
      this.rightMaterial,
    );

    // Original positions
    this.leftPanel.position.set(-1.2, 0.75, -2.1);
    this.rightPanel.position.set(1.2, 0.75, -2.1);

    // Original inward rotations
    this.leftPanel.rotation.y = 0.16;
    this.rightPanel.rotation.y = -0.16;

    this.panelHomes.set(this.leftPanel, {
      position: this.leftPanel.position.clone(),
      rotation: new Vector3(
        this.leftPanel.rotation.x,
        this.leftPanel.rotation.y,
        this.leftPanel.rotation.z,
      ),
      scale: this.leftPanel.scale.clone(),
    });

    this.panelHomes.set(this.rightPanel, {
      position: this.rightPanel.position.clone(),
      rotation: new Vector3(
        this.rightPanel.rotation.x,
        this.rightPanel.rotation.y,
        this.rightPanel.rotation.z,
      ),
      scale: this.rightPanel.scale.clone(),
    });

    const panels = new Group();
    panels.add(this.leftPanel, this.rightPanel);

    this.displayRoot.add(panels);
    panels.visible = false;

    // Register both panels as XR ray-interactable targets
    this.world
      .createTransformEntity(this.leftPanel)
      .addComponent(RayInteractable);

    this.world
      .createTransformEntity(this.rightPanel)
      .addComponent(RayInteractable);

    // Toggle focus using IWSDK pointer click events
    const handleLeftClick = () => {
      this.toggleFocus(this.leftPanel);
    };

    const handleRightClick = () => {
      this.toggleFocus(this.rightPanel);
    };

    this.leftPanel.addEventListener('click', handleLeftClick);
    this.rightPanel.addEventListener('click', handleRightClick);

    // Load anatomical images
    this.heartImage = this.loadImage(
      '/images/heart.png',
      'heart',
    );

    this.lungsImage = this.loadImage(
      '/images/lungs.png',
      'lungs',
    );

    const handleOrganSelected = (event: Event) => {
      const customEvent =
        event as CustomEvent<{ organ: OrganName }>;

      this.focusedPanel = null;
      this.showOrgan(customEvent.detail.organ);
      panels.visible = true;
    };

    const handleOrganGrabbed = () => {
      this.focusedPanel = null;
      panels.visible = false;
    };

    window.addEventListener('organ-selected', handleOrganSelected);
    window.addEventListener('organ-grabbed', handleOrganGrabbed);

    this.cleanupFuncs.push(
      () => this.leftPanel.removeEventListener(
        'click',
        handleLeftClick,
      ),
      () => this.rightPanel.removeEventListener(
        'click',
        handleRightClick,
      ),
      () => window.removeEventListener(
        'organ-selected',
        handleOrganSelected,
      ),
      () => window.removeEventListener(
        'organ-grabbed',
        handleOrganGrabbed,
      ),
      () => {
        this.displayRoot.remove(panels);

        this.leftPanel.geometry.dispose();
        this.rightPanel.geometry.dispose();

        this.leftMaterial.dispose();
        this.rightMaterial.dispose();

        this.leftTexture.dispose();
        this.rightTexture.dispose();
      },
    );

    console.log('[HolographicDisplays] Panels ready!');
  }

  update(delta: number): void {
    const smoothness = 1 - Math.exp(-8 * delta);

    for (const [panel, home] of this.panelHomes) {
      const isFocused = panel === this.focusedPanel;

      const targetPosition = isFocused
        ? this.focusPosition
        : home.position;

      const targetScale = isFocused
        ? this.focusScale
        : home.scale;

      const targetRotation = isFocused
        ? new Vector3(0, 0, 0)
        : home.rotation;

      panel.position.lerp(targetPosition, smoothness);
      panel.scale.lerp(targetScale, smoothness);

      panel.rotation.x +=
        (targetRotation.x - panel.rotation.x) * smoothness;

      panel.rotation.y +=
        (targetRotation.y - panel.rotation.y) * smoothness;

      panel.rotation.z +=
        (targetRotation.z - panel.rotation.z) * smoothness;
    }
  }

  private toggleFocus(panel: Mesh): void {
    this.focusedPanel =
      this.focusedPanel === panel ? null : panel;
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1300;
    return canvas;
  }

  private createMaterial(texture: CanvasTexture): MeshBasicMaterial {
    return new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.96,
      side: DoubleSide,
      depthWrite: false,
    });
  }

  private loadImage(
    src: string,
    organ: OrganName,
  ): HTMLImageElement {
    const image = new Image();

    image.onload = () => {
      console.log(`[HolographicDisplays] Loaded ${organ} image`);

      if (this.currentOrgan === organ) {
        this.showOrgan(organ);
      }
    };

    image.onerror = () => {
      console.error(
        `[HolographicDisplays] Could not load ${src}`,
      );
    };

    image.src = src;
    return image;
  }

  private showOrgan(organ: OrganName): void {
    this.currentOrgan = organ;

    const leftContext = this.leftCanvas.getContext('2d');
    const rightContext = this.rightCanvas.getContext('2d');

    if (!leftContext || !rightContext) return;

    const image =
      organ === 'heart' ? this.heartImage : this.lungsImage;

    if (organ === 'heart') {
      this.drawPanel(
        leftContext,
        'ANATOMY',
        'THE HUMAN HEART',
        [
          'A muscular organ divided into four chambers.',
          '• Right atrium',
          '• Right ventricle',
          '• Left atrium',
          '• Left ventricle',
          '',
          'The four chambers work together to move blood through the body.',
        ],
        image,
      );

      this.drawPanel(
        rightContext,
        'FUNCTION',
        'HOW IT WORKS',
        [
          'The heart acts as a muscular pump.',
          '• The right side sends blood to the lungs.',
          '• The lungs add oxygen to the blood.',
          '• The left side pumps oxygen-rich blood around the body.',
          '',
          'The heart keeps this circulation going continuously.',
        ],
        null,
      );
    } else {
      this.drawPanel(
        leftContext,
        'ANATOMY',
        'THE HUMAN LUNGS',
        [
          'Two spongy organs inside the chest.',
          '• Right lung: three lobes',
          '• Left lung: two lobes',
          '• Bronchi carry air into the lungs.',
          '• Smaller bronchioles branch throughout the lungs.',
          '• Alveoli are tiny air sacs.',
        ],
        image,
      );

      this.drawPanel(
        rightContext,
        'FUNCTION',
        'HOW THEY WORK',
        [
          'The lungs exchange gases between air and blood.',
          '• Inhaling brings air into the lungs.',
          '• Oxygen passes into the blood at the alveoli.',
          '• Carbon dioxide passes from the blood into the alveoli.',
          '• Exhaling removes carbon dioxide.',
          '',
          'This process helps supply the body with oxygen.',
        ],
        null,
      );
    }

    this.leftTexture.needsUpdate = true;
    this.rightTexture.needsUpdate = true;
  }

  private drawPanel(
    ctx: CanvasRenderingContext2D,
    category: string,
    heading: string,
    lines: string[],
    image: HTMLImageElement | null,
  ): void {
    const width = 1200;
    const height = 1300;

    ctx.clearRect(0, 0, width, height);

    // Dark background
    ctx.fillStyle = 'rgba(7, 21, 33, 0.96)';
    ctx.fillRect(0, 0, width, height);

    // Outer border
    ctx.strokeStyle = '#22D3C5';
    ctx.lineWidth = 7;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Inner border
    ctx.strokeStyle = 'rgba(112, 230, 224, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    // Category
    ctx.fillStyle = '#70E6E0';
    ctx.font = 'bold 38px Arial';
    ctx.fillText(category, 65, 105);

    // Heading
    ctx.fillStyle = '#E7F4F3';
    ctx.font = 'bold 55px Arial';

    this.drawWrappedText(
      ctx,
      heading,
      65,
      200,
      1000,
      65,
    );

    // Main divider
    ctx.fillStyle = '#22D3C5';
    ctx.fillRect(65, 250, 1070, 4);

    // Image divider only on the left panel
    if (image) {
      ctx.fillStyle = 'rgba(112, 230, 224, 0.35)';
      ctx.fillRect(735, 300, 2, 850);
    }

    // Information text
    ctx.fillStyle = '#E7F4F3';
    ctx.font = '46px Arial';

    const textMaxWidth = image ? 620 : 1060;
    let y = 350;

    for (const line of lines) {
      if (line === '') {
        y += 25;
        continue;
      }

      const wrappedLines = this.wrapText(
        ctx,
        line,
        textMaxWidth,
      );

      for (const wrappedLine of wrappedLines) {
        ctx.fillText(wrappedLine, 65, y);
        y += 65;
      }
    }

    // Only the left panel gets the anatomical image
    if (image) {
      this.drawOrganImage(ctx, image);
    }

    // Footer
    ctx.fillStyle = '#70E6E0';
    ctx.font = '25px Arial';
    ctx.fillText('ANATOMY EXPLORATION STATION', 65, 1240);
  }

  private drawOrganImage(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
  ): void {
    const areaX = 770;
    const areaY = 330;
    const areaWidth = 360;
    const areaHeight = 760;

    ctx.save();

    ctx.fillStyle = '#70E6E0';
    ctx.font = 'bold 25px Arial';
    ctx.fillText('3D ANATOMICAL VIEW', areaX, 290);

    if (!image.complete || image.naturalWidth === 0) {
      ctx.fillStyle = '#70E6E0';
      ctx.font = '28px Arial';
      ctx.fillText('LOADING IMAGE...', areaX + 35, 700);
      ctx.restore();
      return;
    }

    const imageRatio =
      image.naturalWidth / image.naturalHeight;

    const areaRatio = areaWidth / areaHeight;

    let drawWidth: number;
    let drawHeight: number;

    if (imageRatio > areaRatio) {
      drawWidth = areaWidth;
      drawHeight = areaWidth / imageRatio;
    } else {
      drawHeight = areaHeight;
      drawWidth = areaHeight * imageRatio;
    }

    const drawX = areaX + (areaWidth - drawWidth) / 2;
    const drawY = areaY + (areaHeight - drawHeight) / 2;

    ctx.shadowColor = '#22D3C5';
    ctx.shadowBlur = 25;
    ctx.filter =
      'hue-rotate(150deg) saturate(1.5) brightness(1.15)';

    ctx.drawImage(
      image,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    ctx.filter = 'none';
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(112, 230, 224, 0.35)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(
      areaX + areaWidth / 2,
      areaY + areaHeight / 2,
      190,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    ctx.restore();
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ): void {
    const lines = this.wrapText(ctx, text, maxWidth);

    lines.forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight);
    });
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine
        ? `${currentLine} ${word}`
        : word;

      if (
        ctx.measureText(testLine).width > maxWidth &&
        currentLine
      ) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
