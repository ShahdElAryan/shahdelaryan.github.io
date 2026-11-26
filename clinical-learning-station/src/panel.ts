
import { createSystem, UIKitMLAsset, VisibilityState } from '@iwsdk/core';

export class PanelSystem extends createSystem({}) {
  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('welcome-panel');

    const xrButton = panel?.getElementById('xr-button');
    const exitButton = panel?.getElementById('exit-button');
    const startButton = panel?.getElementById('start-button');
    const welcomeContent = panel?.getElementById('welcome-content');

    const instructionOne = panel?.getElementById('instruction-one');
    const instructionThree = panel?.getElementById('instruction-three');

    if (
      xrButton == null ||
      exitButton == null ||
      startButton == null ||
      welcomeContent == null ||
      instructionOne == null ||
      instructionThree == null
    ) {
      console.error('[Panel] Missing welcome or instruction panel elements.');
      return;
    }

    if (!this.world.xrEnabled) {
      xrButton.setProperties({ display: 'none' });
      exitButton.setProperties({ display: 'none' });
      startButton.setProperties({ display: 'none' });
      return;
    }

    const launchXR = () => this.world.launchXR();
    const exitXR = () => this.world.exitXR();

    const beginExploration = () => {
      welcomeContent.setProperties({ display: 'none' });
      startButton.setProperties({ display: 'none' });

      instructionOne.setProperties({ display: 'flex' });
      instructionThree.setProperties({ display: 'none' });

      window.dispatchEvent(
        new Event('start-anatomy-experience'),
      );
    };

    const handleOrganGrabbed = () => {
      instructionOne.setProperties({ display: 'none' });
      instructionThree.setProperties({ display: 'flex' });
    };

    const handleOrganSelected = () => {
      instructionThree.setProperties({ display: 'none' });
    };

    xrButton.addEventListener('click', launchXR);
    exitButton.addEventListener('click', exitXR);
    startButton.addEventListener('click', beginExploration);

    window.addEventListener('organ-grabbed', handleOrganGrabbed);
    window.addEventListener('organ-selected', handleOrganSelected);

    this.cleanupFuncs.push(
      () => xrButton.removeEventListener('click', launchXR),
      () => exitButton.removeEventListener('click', exitXR),
      () => startButton.removeEventListener('click', beginExploration),

      () => window.removeEventListener('organ-grabbed', handleOrganGrabbed),
      () => window.removeEventListener('organ-selected', handleOrganSelected),

      this.world.visibilityState.subscribe((visibilityState) => {
        const is2D = visibilityState === VisibilityState.NonImmersive;

        xrButton.setProperties({ display: is2D ? 'flex' : 'none' });
        exitButton.setProperties({ display: is2D ? 'none' : 'flex' });
        startButton.setProperties({
          display: is2D ? 'none' : 'flex',
        });
      }),
    );
  }
}
