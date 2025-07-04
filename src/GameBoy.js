import { CPU } from "./CPU.js";
import {
  closeActiveModals,
  createSelectOption,
  handleOpenModal,
} from "./GameBoyUtils.js";

class GameBoy {
  #defaultFrameRate = 0;
  #customFrameRate = 0;
  #gameLoaded = false;
  #gamePaused = false;

  #settings = {
    interface: {
      colorTheme: {
        key: "colorTheme",
        value: document.getElementById("color-theme"),
      },
      showButtons: {
        key: "showButtons",
        value: document.getElementById("show-buttons"),
      },
    },

    game: {
      emulationSpeed: {
        key: "emulationSpeed",
        value: document.getElementById("emulation-speed"),
      },
    },

    audio: {
      volume: {
        key: "volume",
        range: document.getElementById("volume-range"),
        value: document.getElementById("volume-value"),
      },
      channels: {
        ch1: { id: 1, key: "ch1", value: document.getElementById("ch1") },
        ch2: { id: 2, key: "ch2", value: document.getElementById("ch2") },
        ch3: { id: 3, key: "ch3", value: document.getElementById("ch3") },
      },
    },

    graphics: {
      screenSize: {
        key: "screenSize",
        value: document.getElementById("screen-size"),
      },
      colorPalette: {
        key: "colorPalette",
        value: document.getElementById("color-palette"),
      },
    },

    joypad: {
      keyboard: {
        key: "keyboard",
        values: document.querySelectorAll(".joypad-row input"),
      },
    },
  };

  constructor() {
    this.cpu = new CPU();

    this.#defaultFrameRate = 1000 / (this.cpu.CLOCKSPEED / 70224); // ms
    this.#customFrameRate = this.#defaultFrameRate;

    this.#handleInputFiles();
    this.#handleSettingsModal();
    this.#handleResponsive();
    this.#handlePauseEmulation();
    this.#handleResumeEmulation();
    this.#handleQuitGameModal();
    this.#handleUserLeaveWindow();
    this.cpu.init();
    this.#setInitScreenText();
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
        this.#renderText(error.message, "#6f0119"); // Render error
        throw new Error(error);
      }

      // Game loaded
      this.#switchState("running");
      this.#start();
    });
  }

  #handlePauseEmulation() {
    document.getElementById("pause-btn").onclick = () => {
      this.#pauseEmulation();
    };
  }

  #handleResumeEmulation() {
    document.getElementById("resume-btn").onclick = () => {
      this.#resumeEmulation();
    };
  }

  #handleQuitGameModal() {
    const modal = document.getElementById("confirm-modal");
    const openBtn = document.getElementById("quit-btn");
    const closeBtn = document.getElementById("close-confirm");
    const noBtn = document.getElementById("confirm-no");
    const yesBtn = document.getElementById("confirm-yes");

    handleOpenModal(modal, [closeBtn, noBtn], [openBtn]);

    yesBtn.onclick = () => {
      this.#quitGame();
      closeActiveModals();
    };
  }

  #quitGame() {
    const fileInput = document.getElementById("fileInput");

    // Stop game
    clearInterval(this.emulationInterval);
    this.#gamePaused = false;
    this.#gameLoaded = false;
    this.windowPauseEnabled = false;

    // Reset memory and registers
    this.cpu = new CPU();
    this.cpu.init();

    // Reset screen
    this.#setInitScreenText();

    // Reset settings and clear file from input
    this.#applySettings();
    fileInput.value = null;

    // Switch emulation state
    this.#switchState("load");
  }

  #switchState(state) {
    const emulationFlowButtons = document.querySelector(".emulation-flow-btns");

    switch (state) {
      case "running":
        emulationFlowButtons.classList.remove("load-state");
        emulationFlowButtons.classList.remove("paused-state");
        emulationFlowButtons.classList.add("running-state");
        this.#gameLoaded = true;
        this.#gamePaused = false;
        break;

      case "paused":
        emulationFlowButtons.classList.remove("running-state");
        emulationFlowButtons.classList.add("paused-state");
        this.#gamePaused = true;
        break;

      case "load":
        emulationFlowButtons.classList.remove("paused-state");
        emulationFlowButtons.classList.add("load-state");
        this.#gameLoaded = true;
        this.#gamePaused = false;
        break;
    }
  }

  #handleSettingsModal() {
    const modal = document.getElementById("config-modal");
    const btn = document.getElementById("settings-btn");
    const headerBtn = document.getElementById("settings-header");
    const closeBtn = document.getElementById("close-settings");

    handleOpenModal(modal, [closeBtn], [btn, headerBtn]);

    // Handle settings
    this.#handleGraphicsSettings();
    this.#handleGameSettings();
    this.#handleInterfaceSettings();
    this.#handleAudioSettings();
    this.#handleJoypadSettings();
  }

  #start() {
    this.#resetScreen();

    // Emulate frames
    this.emulationInterval = setInterval(() => {
      this.cpu.emulateFrame();
    }, this.#customFrameRate);

    this.windowPauseEnabled = true;
  }

  #pauseEmulation() {
    if (this.#gamePaused) return;
    clearInterval(this.emulationInterval);
    this.cpu.apu.mute();
    this.#switchState("paused");
  }

  #resumeEmulation() {
    if (!this.#gamePaused) return;
    this.emulationInterval = setInterval(() => {
      this.cpu.emulateFrame();
    }, this.#customFrameRate);
    this.cpu.apu.unmute();
    this.#switchState("running");
  }

  #resetScreen() {
    const canvas = this.cpu.gpu.screen;

    canvas.width = 160;
    canvas.height = 144;
  }

  async #setInitScreenText() {
    const canvas = this.cpu.gpu.screen;
    const color = localStorage.getItem(
      this.#settings.graphics.colorPalette.key
    );
    await document.fonts.ready;

    // Resize canvas to avoid blur
    const scale = 4;
    canvas.width = canvas.width * scale;
    canvas.height = canvas.height * scale;

    // Render text
    this.#updateInitScreenColor(color);
  }

  #renderText(text, color = "#000") {
    const ctx = this.cpu.gpu.context;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "25px 'Press Start 2P'";
    ctx.fillStyle = color;

    const maxWidth = canvas.width * 0.8;
    const lineHeight = 30;

    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + " " + word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2;

    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });
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
    const emulationSpeed = this.#settings.game.emulationSpeed.value;

    // Handle emulation speed change
    emulationSpeed.addEventListener("change", () => {
      this.#updateGameSpeed();
    });
  }

  #updateGameSpeed() {
    const emulationSpeed = this.#settings.game.emulationSpeed.value;
    const newFrameRate =
      this.#defaultFrameRate / parseFloat(emulationSpeed.value);

    this.#customFrameRate = newFrameRate;
    // Update speed if game running and not paused
    if (this.#gameLoaded && !this.#gamePaused) {
      clearInterval(this.emulationInterval);
      this.emulationInterval = setInterval(() => {
        this.cpu.emulateFrame();
      }, newFrameRate);
    }
  }

  #handleAudioSettings() {
    const { range: volumeRange, key: key } = this.#settings.audio.volume;

    const storedVolume = localStorage.getItem(key);

    // Set stored volume
    if (storedVolume) volumeRange.value = parseFloat(storedVolume);

    // Handle update volume
    volumeRange.addEventListener("input", () => {
      this.#updateVolume();
    });

    Object.values(this.#settings.audio.channels).forEach((ch) => {
      // Deactivate channels stored as false
      const storedChValue = localStorage.getItem(ch.key);
      if (storedChValue != null && storedChValue == "false") {
        this.cpu.apu.mute(ch.id);
        ch.value.checked = false;
      }

      // Handle channel activation
      ch.value.addEventListener("change", () => {
        this.#updateActiveChannels(ch);
      });
    });

    this.#updateVolume();
  }

  #updateVolume() {
    const {
      range: volumeRange,
      value: volumeValue,
      key: key,
    } = this.#settings.audio.volume;

    volumeValue.innerText = Math.round(volumeRange.value * 100); // Update visual value
    this.cpu.apu.masterVolume = volumeRange.value * this.cpu.apu.maxVolume; // Update APU volume
    localStorage.setItem(key, volumeRange.value);
  }

  #updateActiveChannels(ch) {
    if (!ch) {
      // All channels
      Object.values(this.#settings.audio.channels).forEach((ch) => {
        if (ch.value.checked) {
          this.cpu.apu.unmute(ch.id);
          localStorage.setItem(ch.key, true);
        } else {
          this.cpu.apu.mute(ch.id);
          localStorage.setItem(ch.key, false);
        }
      });
    } else if (ch.value.checked) {
      // Activate specific channel
      this.cpu.apu.unmute(ch.id);
      localStorage.setItem(ch.key, true);
    } else {
      // Deactivate specific channel
      this.cpu.apu.mute(ch.id);
      localStorage.setItem(ch.key, false);
    }
  }

  #handleGraphicsSettings() {
    const canvas = this.cpu.gpu.screen;

    // Screen size. Default size determined by css or local storage
    const selectSize = this.#settings.graphics.screenSize.value;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const sizeValue = `${width}x${height}`;
    const halfSizeValue = `${Math.round(width / 2)}x${Math.round(height / 2)}`;
    const storedSize = localStorage.getItem(
      this.#settings.graphics.screenSize.key
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
          this.#settings.graphics.screenSize.key,
          selectSize.value
        );
      });
    }

    // Color palette
    const palette = this.#settings.graphics.colorPalette.value;
    const storedPalette = localStorage.getItem(
      this.#settings.graphics.colorPalette.key
    );

    if (storedPalette) {
      palette.value = storedPalette;
      this.cpu.gpu.updatePalette(storedPalette);
    }

    palette.addEventListener("change", () => {
      this.#updateColorPalette();
    });
  }

  #updateColorPalette() {
    const palette = this.#settings.graphics.colorPalette.value;

    this.cpu.gpu.updatePalette(palette.value);
    localStorage.setItem(
      this.#settings.graphics.colorPalette.key,
      palette.value
    );
    this.#updateInitScreenColor(palette.value);
  }

  #handleInterfaceSettings() {
    const selectColorTheme = this.#settings.interface.colorTheme.value;
    const selectShowButtons = this.#settings.interface.showButtons.value;
    const storedColorTheme = localStorage.getItem(
      this.#settings.interface.colorTheme.key
    );
    const storedShowButtons = localStorage.getItem(
      this.#settings.interface.showButtons.key
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
        this.#settings.interface.colorTheme.key,
        selectColorTheme.value
      );
      root.classList.toggle("light", selectColorTheme.value == "light");
    });

    // Hide buttons if false stored
    if (storedShowButtons != null && storedShowButtons == "false") {
      selectShowButtons.checked = false;
      joypad.forEach((el) => {
        el.style.display = "none";
      });
    }

    // Handle show buttons
    selectShowButtons.addEventListener("change", () => {
      localStorage.setItem(
        this.#settings.interface.showButtons.key,
        selectShowButtons.checked
      );

      const display = selectShowButtons.checked ? "flex" : "none";
      joypad.forEach((el) => {
        el.style.display = display;
      });
    });
  }

  #handleJoypadSettings() {
    // Apply stored keys
    for (let i = 0; i < 8; i++) {
      const key = localStorage.getItem(i);
      if (key) this.#updateKeyboard({ id: i, value: key }, true);
    }

    this.#settings.joypad.keyboard.values.forEach((key) => {
      key.addEventListener("click", () => {
        this.#updateKeyboard({ id: key.id, value: key.value });
      });
    });
  }

  #updateKeyboard(key, nonUserInput) {
    const inputs = [...this.#settings.joypad.keyboard.values].sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    const input = inputs[key.id];

    const getRepeatedKey = (key) => {
      const repeatedKey = inputs.filter((input) => {
        return input.value == key;
      });

      return repeatedKey.length > 0 ? repeatedKey[0] : null;
    };

    if (nonUserInput) {
      const repeatedKey = getRepeatedKey(key.value);
      if (repeatedKey) {
        // Button asigned, clear it
        this.cpu.joypad.buttons[repeatedKey.id] = null;
        repeatedKey.value = "";
      }
      input.value = key.value;
      this.cpu.joypad.buttons[key.id] = key.value;
      return;
    }

    const pressKeyText = document.getElementById("press-key-text");

    const currentValue = key.value;

    pressKeyText.style.visibility = "visible";
    input.value = "";
    input.classList.add("listening");

    window.addEventListener(
      "keydown",
      (e) => {
        e.preventDefault();

        // Set key if pressed
        const pressedKey = e.key.toUpperCase();
        if (pressedKey == "ESCAPE") input.value = currentValue;
        else {
          const repeatedKey = getRepeatedKey(pressedKey);

          if (repeatedKey) {
            // Button asigned, clear it
            this.cpu.joypad.buttons[repeatedKey.id] = null;
            repeatedKey.value = "";
            localStorage.removeItem(repeatedKey.id);
          }
          input.value = pressedKey;
          this.cpu.joypad.buttons[key.id] = pressedKey;

          // Store value
          localStorage.setItem(key.id, pressedKey);
        }

        pressKeyText.style.visibility = "hidden";
        input.classList.remove("listening");
      },
      { once: true }
    );
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

  #handleUserLeaveWindow() {
    let gamePausedByWindow = false;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (!this.#gamePaused && this.windowPauseEnabled) {
          this.#pauseEmulation();
          gamePausedByWindow = true;
        }
      } else if (
        this.#gamePaused &&
        gamePausedByWindow &&
        this.windowPauseEnabled
      ) {
        this.#resumeEmulation();
        gamePausedByWindow = false;
      }
    });
  }

  #applySettings() {
    this.#updateGameSpeed();
    this.#updateColorPalette();
    this.#updateActiveChannels();
    this.#updateVolume();
    this.#updateActiveChannels();
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
