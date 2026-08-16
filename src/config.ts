import Phaser from "phaser";
import { GAME } from "./data/gameConfig";
import { BootScene } from "./game/scenes/BootScene";
import { SplashScene } from "./game/scenes/SplashScene";
import { GameScene } from "./game/scenes/GameScene";
import { LevelUpScene } from "./game/scenes/LevelUpScene";
import { PauseScene } from "./game/scenes/PauseScene";
import { VictoryScene } from "./game/scenes/VictoryScene";
import { DefeatScene } from "./game/scenes/DefeatScene";
import { PlaceholderScene } from "./game/scenes/PlaceholderScene";
import { EggHatchScene } from "./game/scenes/EggHatchScene";
import { ReviveScene } from "./game/scenes/ReviveScene";
import { DebugPanelScene } from "./game/scenes/DebugPanelScene";

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  // Canvas renderer: maximum compatibility (WebGL can break under Brave
  // fingerprint protection, remote desktops and virtualized environments).
  type: Phaser.CANVAS,
  parent: "game",
  backgroundColor: "#0b1026",
  width: GAME.width,
  height: GAME.height,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    SplashScene,
    GameScene,
    LevelUpScene,
    PauseScene,
    VictoryScene,
    DefeatScene,
    PlaceholderScene,
    EggHatchScene,
    ReviveScene,
    DebugPanelScene,
  ],
};
