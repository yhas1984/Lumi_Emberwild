import Phaser from "phaser";
import { createAllTextures } from "../../utils/textureFactory";
import { bootStatus } from "../../utils/bootStatus";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    bootStatus("Generando texturas…");
    createAllTextures(this);
    bootStatus("Texturas listas — arrancando…");
    this.scene.start("Splash");
  }
}