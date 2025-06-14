import { APU } from "./APU/APU.js";
import { CPU } from "./CPU.js";
import { PPU } from "./GPU.js";
import { createSelectOption } from "./GameBoyUtils.js";
import { Joypad } from "./Joypad.js";
import { MMU } from "./MMU.js";
import { Timer } from "./Timer.js";

class GameBoy {
  #defaultFrameRate = 0;
  #customFrameRate = 0;
  #gameLoaded = false;

  #settingsKeys = {
    interface: {
      colorTheme: "colorTheme",
      showButtons: "showButtons",
    },
    game: {
      emulationSpeed: "emulationSpeed",
    },
    graphics: {
      screenSize: "screenSize",
      colorPalette: "colorPalette",
    },
    joypad: {
      keys: "keys",
    },
  };

  constructor() {
    this.cpu = new CPU();

    this.#defaultFrameRate = 1000 / (this.cpu.CLOCKSPEED / 70224); // ms
    this.#customFrameRate = this.#defaultFrameRate;

    this.#handleInputFiles();
    // this.#handleSettingsModal();
    this.#handleResponsive();
    this.cpu.init();
    // this.#setInitScreenText();
  }

  #handleInputFiles() {
    const fileInput = document.getElementById("fileInput");
    const customInput = document.getElementById("customInput-btn");

    customInput.addEventListener("click", () => fileInput.click());

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
      this.#gameLoaded = true;
      this.#start();
    });
  }

  #handleSettingsModal() {
    // Get the modal
    var modal = document.getElementById("config-modal");

    // Get the button that opens the modal
    var btn = document.getElementById("settings-btn");

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks on the button, open the modal
    btn.onclick = function () {
      modal.style.display = "block";
    };

    // When user press escape, close the modal
    document.addEventListener("keydown", (event) => {
      if (event.key == "Escape") modal.style.display = "none";
    });

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
      modal.style.display = "none";
    };

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };

    // Handle settings
    this.#handleGraphicsSettings();
    this.#handleGameSettings();
  }

  #start() {
    this.#resetScreen();

    // Emulate frames
    this.emulationInterval = setInterval(() => {
      this.cpu.emulateFrame();
    }, this.#customFrameRate);
  }

  #resetScreen() {
    const canvas = this.cpu.gpu.screen;

    canvas.width = 160;
    canvas.height = 144;
  }

  async #setInitScreenText() {
    const canvas = this.cpu.gpu.screen;
    const ctx = this.cpu.gpu.context;
    const color = localStorage.getItem(this.#settingsKeys.graphics.palette);
    await document.fonts.ready;

    // Resize canvas to avoid blur
    const scale = 4;
    canvas.width = canvas.width * scale;
    canvas.height = canvas.height * scale;

    // Render text
    this.#updateInitScreenColor(color);
  }

  #updateInitScreenColor(color) {
    const canvas = this.cpu.gpu.screen;
    const ctx = this.cpu.gpu.context;

    ctx.fillStyle = color == "green" ? "rgb(15, 56, 15)" : "black";
    canvas.style.backgroundColor =
      color == "green" ? "rgb(155, 188, 15)" : "white";

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.imageSmoothingEnabled = false;
    ctx.font = "76px 'Press Start 2P'";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GBJS", centerX, centerY);
    ctx.font = "25px 'Press Start 2P'";
    ctx.fillText("byacr575", centerX + 150, centerY + 50);
  }

  #handleGameSettings() {
    // Handle emulation speed change
    const selectEmulationSpeed = document.getElementById("emulation-speed");
    selectEmulationSpeed.addEventListener("change", () => {
      const newFrameRate =
        this.#defaultFrameRate / parseFloat(selectEmulationSpeed.value);

      this.#customFrameRate = newFrameRate;
      // Update speed if game running
      if (this.#gameLoaded) {
        clearInterval(this.emulationInterval);
        this.emulationInterval = setInterval(() => {
          this.cpu.emulateFrame();
        }, newFrameRate);
      }
    });
  }

  #handleGraphicsSettings() {
    const canvas = this.cpu.gpu.screen;

    // Screen size. Default size determined by css or local storage
    const selectSize = document.getElementById("screen-size");
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const sizeValue = `${width}x${height}`;
    const halfSizeValue = `${Math.round(width / 2)}x${Math.round(height / 2)}`;
    const storedSize = localStorage.getItem(
      this.#settingsKeys.graphics.screenSize
    );

    createSelectOption(
      [
        { text: halfSizeValue, value: `${width / 2}x${height / 2}` },
        { text: sizeValue, value: sizeValue },
      ],
      selectSize
    );

    selectSize.value = sizeValue; // Set size option

    if (storedSize) {
      selectSize.value = storedSize;
      const currentSize = storedSize.split("x");
      const currentWidth = currentSize[0] + "px";
      const currentHeight = currentSize[1] + "px";
      this.cpu.gpu.screen.style.width = currentWidth;
      this.cpu.gpu.screen.style.height = currentHeight;
    }

    // Handle size change
    selectSize.addEventListener("change", () => {
      const newSize = selectSize.value.split("x");
      const newWidth = newSize[0] + "px";
      const newHeight = newSize[1] + "px";
      this.cpu.gpu.screen.style.width = newWidth;
      this.cpu.gpu.screen.style.height = newHeight;

      // Store size
      localStorage.setItem(
        this.#settingsKeys.graphics.screenSize,
        selectSize.value
      );
    });

    // Color palette
    const palette = document.getElementById("color-palette");
    const storedPalette = localStorage.getItem(
      this.#settingsKeys.graphics.palette
    );

    if (storedPalette) {
      palette.value = storedPalette;
      this.cpu.gpu.updatePalette(storedPalette);
    }

    palette.addEventListener("change", () => {
      this.cpu.gpu.updatePalette(palette.value);
      localStorage.setItem(this.#settingsKeys.graphics.palette, palette.value);
      this.#updateInitScreenColor(palette.value);
    });
  }

  #handleResponsive() {
    const header = document.querySelector("header");
    const joypadContainer = document.getElementById("joypad-left");
    const mainButtons = document.getElementById("main-buttons");
    const content = document.getElementById("content");

    const mobileLandscape = window.matchMedia(
      "(orientation:landscape) and (max-width: 1024px) and (max-height: 540px)"
    );
    const moveHeaderAndButtons = (e) => {
      if (e.matches) {
        // Move header & buttons to joypad div
        joypadContainer.appendChild(header);
        joypadContainer.appendChild(mainButtons);
      } else {
        // Move header & buttons back to its position
        document.body.prepend(header);
        content.appendChild(mainButtons);
      }
    };

    mobileLandscape.addEventListener("change", moveHeaderAndButtons);
    moveHeaderAndButtons(mobileLandscape);
  }
}

/* MAIN SCRIPT */

new GameBoy();
