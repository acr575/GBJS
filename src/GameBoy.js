import { APU } from "./APU/APU.js";
import { CPU } from "./CPU.js";
import { PPU } from "./GPU.js";
import { Joypad } from "./Joypad.js";
import { MMU } from "./MMU.js";
import { Timer } from "./Timer.js";

class GameBoy {
  constructor() {
    this.cpu = new CPU();

    this.frameRate = 1000 / (this.cpu.CLOCKSPEED / 70224); // ms

    this.#handleInputFiles();
    this.cpu.init();
  }

  #handleInputFiles() {
    const fileInput = document.getElementById("fileInput");

    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];

      if (!file) return;

      try {
        await this.cpu.mmu.load(file);
      } catch (error) {
        // TODO: Show errors
        console.error(error);
      }

      // Game loaded
      this.#start();
    });
  }

  #start() {
    // Emulate frames
    this.emulationInterval = setInterval(() => {
      this.cpu.emulateFrame();
    }, this.frameRate);
  }
}

/* MAIN SCRIPT */

const gb = new GameBoy();
