
import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';

import { PanelSystem } from './panel.js';
import { RobotSystem } from './robot.js';
import { AnatomySystem } from './anatomy.js';
import { PlatformSystem } from './platform.js';
import { HolographicDisplaysSystem } from './holographic-displays.js';
import { SoundPanelSystem } from './sound-panel.js';
import { EffectsSystem } from './effects.js';
import { OrganGlowSystem } from './organ-glow.js';
import { OrganSoundsSystem } from './organ-sounds.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(RobotSystem);
  world.registerSystem(PanelSystem);
  world.registerSystem(HolographicDisplaysSystem);
  world.registerSystem(AnatomySystem);
  world.registerSystem(OrganGlowSystem);
  world.registerSystem(OrganSoundsSystem);
  world.registerSystem(PlatformSystem);
  world.registerSystem(EffectsSystem);
  world.registerSystem(SoundPanelSystem);
});
