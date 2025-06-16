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
    this.#handleSettingsModal();
    this.#handleResponsive();
    this.cpu.init();
    this.#setInitScreenText();
  }

  #stopEmulation() {

  }

  #resumeEmulation() {
    
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
    const modal = document.getElementById("config-modal");
    const btn = document.getElementById("settings-btn");
    const headerBtn = document.getElementById("settings-header");
    const span = document.getElementsByClassName("close")[0];

    // When the user clicks on the button, open the modal
    [btn, headerBtn].forEach((btn) => {
      btn.onclick = function () {
        modal.style.display = "block";
      };
    });

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
    this.#handleInterfaceSettings();
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

    if (selectSize) selectSize.value = sizeValue; // Set size option

    if (storedSize && selectSize) {
      selectSize.value = storedSize;
      const currentSize = storedSize.split("x");
      const currentWidth = currentSize[0] + "px";
      const currentHeight = currentSize[1] + "px";
      this.cpu.gpu.screen.style.width = currentWidth;
      this.cpu.gpu.screen.style.height = currentHeight;
    }

    if (selectSize) {
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
    }

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

  #handleInterfaceSettings() {
    const selectColorTheme = document.getElementById("color-theme");
    const selectShowButtons = document.getElementById("show-buttons");
    const storedColorTheme = localStorage.getItem(
      this.#settingsKeys.interface.colorTheme
    );
    const storedShowButtons = localStorage.getItem(
      this.#settingsKeys.interface.showButtons
    );
    const root = document.documentElement;
    const joypad = document.querySelectorAll(".joypad");

    // Apply stored theme
    if (storedColorTheme == "light") {
      root.classList.add("light");
      selectColorTheme.value = "light";
    }
    // Handle color theme change
    selectColorTheme.addEventListener("change", () => {
      localStorage.setItem(
        this.#settingsKeys.interface.colorTheme,
        selectColorTheme.value
      );
      root.classList.toggle("light", selectColorTheme.value == "light");
    });

    // Hide buttons if false stored
    if (storedShowButtons != null && storedShowButtons == 'false') {
      selectShowButtons.checked = false;
      joypad.forEach((el) => {
        el.style.display = "none";
      });
    }

    // Handle show buttons
    selectShowButtons.addEventListener("change", () => {
      localStorage.setItem(
        this.#settingsKeys.interface.showButtons,
        selectShowButtons.checked
      );

      const display = selectShowButtons.checked ? "flex" : "none";
      joypad.forEach((el) => {
        el.style.display = display;
      });
    });
  }

  #handleResponsive() {
    const header = document.querySelector("header");
    const joypadLeftContainer = document.getElementById("joypad-left");
    const joypadRightContainer = document.getElementById("joypad-right");
    const portraitContainer = document.getElementById("portrait-container");
    const mainButtons = document.getElementById("main-buttons");
    const screenContainer =
      document.getElementsByClassName("screen-buttons")[0];
    const buttonsABContainer = document.getElementsByClassName("a-b")[0];
    const joypadPortraitContainer = document.createElement("div");
    joypadPortraitContainer.id = "joypad-portrait-container";

    const mobileLandscape = this.#isUserMobileAndLandscape();
    const mobilePortrait = this.#isUserScreenPortrait();

    const landscapeAction = (e) => {
      if (e.matches) {
        // Move header & buttons to joypad div
        joypadLeftContainer.appendChild(header);
        joypadLeftContainer.appendChild(mainButtons);
      } else {
        // Move header & buttons back to its position
        document.body.prepend(header);
        portraitContainer.appendChild(mainButtons);
      }
    };

    const portraitAction = (e) => {
      if (e.matches) {
        // Display element in portrait format
        joypadLeftContainer.append(buttonsABContainer);
        joypadPortraitContainer.appendChild(joypadLeftContainer);
        joypadPortraitContainer.appendChild(joypadRightContainer);
        portraitContainer.appendChild(joypadPortraitContainer);
      } else {
        // Move elements to its original position
        joypadRightContainer.appendChild(buttonsABContainer);
        screenContainer.prepend(joypadLeftContainer);
        screenContainer.appendChild(joypadRightContainer);
        joypadPortraitContainer.remove();
      }
    };

    mobileLandscape.addEventListener("change", landscapeAction);
    landscapeAction(mobileLandscape);
    mobilePortrait.addEventListener("change", portraitAction);
    portraitAction(mobilePortrait);
  }

  #isUserScreenPortrait() {
    return window.matchMedia("(orientation:portrait)");
  }

  #isUserMobileAndLandscape() {
    return window.matchMedia(
      "(orientation:landscape) and (max-width: 1024px) and (max-height: 540px)"
    );
  }
}

/* MAIN SCRIPT */

new GameBoy();
