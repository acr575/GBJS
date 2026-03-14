import { CPU } from "./CPU.js";
import {
  closeActiveModals,
  createSelectOption,
  handleOpenModal,
} from "./GameBoyUtils.ts";

export default class GameBoy {
  // TODO: Replace `any` with precise CPU/GPU/APU/MMU types
  cpu: any;
  emulationInterval: any;
  windowPauseEnabled: boolean = false;

  #defaultFrameRate: number = 0;
  #customFrameRate: number = 0;
  #gameLoaded: boolean = false;
  #gamePaused: boolean = false;

  // Settings are initialized lazily to avoid touching `document` at module import time
  #settings: any;

  constructor() {
    this.cpu = new CPU();

    this.#defaultFrameRate = 1000 / (this.cpu.CLOCKSPEED / 70224); // ms
    this.#customFrameRate = this.#defaultFrameRate;

    // Create a settings skeleton (no DOM access here)
    this.#settings = this.#createEmptySettings();

    // Initialize CPU (pure logic)
    this.cpu.init();

    // Only initialize UI bindings when running in a browser
    if (typeof document !== "undefined") {
      this.initUI();

      this.#handleInputFiles();
      this.#handleSettingsModal();
      this.#handleResponsive();
      this.#handlePauseEmulation();
      this.#handleResumeEmulation();
      this.#handleQuitGameModal();
      this.#handleUserLeaveWindow();
      this.#setInitScreenText();
    }
  }

  // Public method to attach DOM bindings if needed
  initUI() {
    // Populate setting DOM references lazily
    this.#settings.interface.colorTheme.value =
      document.getElementById("color-theme") as HTMLSelectElement | null;
    this.#settings.interface.showButtons.value =
      document.getElementById("show-buttons") as HTMLInputElement | null;

    this.#settings.game.emulationSpeed.value =
      document.getElementById("emulation-speed") as HTMLSelectElement | null;

    this.#settings.audio.volume.range =
      document.getElementById("volume-range") as HTMLInputElement | null;
    this.#settings.audio.volume.value =
      document.getElementById("volume-value") as HTMLElement | null;
    this.#settings.audio.channels.ch1.value =
      document.getElementById("ch1") as HTMLInputElement | null;
    this.#settings.audio.channels.ch2.value =
      document.getElementById("ch2") as HTMLInputElement | null;
    this.#settings.audio.channels.ch3.value =
      document.getElementById("ch3") as HTMLInputElement | null;

    this.#settings.graphics.screenSize.value =
      document.getElementById("screen-size") as HTMLSelectElement | null;
    this.#settings.graphics.colorPalette.value =
      document.getElementById("color-palette") as HTMLSelectElement | null;

    this.#settings.joypad.keyboard.values =
      document.querySelectorAll(".joypad-row input") as NodeListOf<HTMLElement>;
  }

  #createEmptySettings() {
    return {
      interface: {
        colorTheme: { key: "colorTheme", value: null as HTMLSelectElement | null },
        showButtons: { key: "showButtons", value: null as HTMLInputElement | null },
      },

      game: {
        emulationSpeed: { key: "emulationSpeed", value: null as HTMLSelectElement | null },
      },

      audio: {
        volume: {
          key: "volume",
          range: null as HTMLInputElement | null,
          value: null as HTMLElement | null,
        },
        channels: {
          ch1: { id: 1, key: "ch1", value: null as HTMLInputElement | null },
          ch2: { id: 2, key: "ch2", value: null as HTMLInputElement | null },
          ch3: { id: 3, key: "ch3", value: null as HTMLInputElement | null },
        },
      },

      graphics: {
        screenSize: { key: "screenSize", value: null as HTMLSelectElement | null },
        colorPalette: { key: "colorPalette", value: null as HTMLSelectElement | null },
      },

      joypad: {
        keyboard: { key: "keyboard", values: null as NodeListOf<HTMLInputElement> | null },
      },
    };
  }

  #handleInputFiles() {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement | null;
    const customInput = document.getElementById("customInput-btn") as HTMLElement | null;

    if (customInput && fileInput) {
      customInput.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files && target.files[0];

        if (!file) return;

        try {
          await this.cpu.mmu.load(file);
        } catch (error: any) {
          this.#renderText(error?.message ?? String(error), "#6f0119"); // Render error
          throw error;
        }

        // Game loaded
        this.#switchState("running");
        this.#start();
      });
    }
  }

  #handlePauseEmulation() {
    const btn = document.getElementById("pause-btn") as HTMLElement | null;
    if (btn) btn.onclick = () => this.#pauseEmulation();
  }

  #handleResumeEmulation() {
    const btn = document.getElementById("resume-btn") as HTMLElement | null;
    if (btn) btn.onclick = () => this.#resumeEmulation();
  }

  #handleQuitGameModal() {
    const modal = document.getElementById("confirm-modal") as HTMLElement | null;
    const openBtn = document.getElementById("quit-btn") as HTMLElement | null;
    const closeBtn = document.getElementById("close-confirm") as HTMLElement | null;
    const noBtn = document.getElementById("confirm-no") as HTMLElement | null;
    const yesBtn = document.getElementById("confirm-yes") as HTMLElement | null;

    if (modal && closeBtn && openBtn) {
      handleOpenModal(modal, [closeBtn, noBtn!], [openBtn]);
    }

    if (yesBtn) {
      yesBtn.onclick = () => {
        this.#quitGame();
        closeActiveModals();
      };
    }
  }

  #quitGame() {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement | null;

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
    if (fileInput) fileInput.value = "";

    // Switch emulation state
    this.#switchState("load");
  }

  #switchState(state: string) {
    const emulationFlowButtons = document.querySelector(
      ".emulation-flow-btns"
    ) as HTMLElement | null;

    if (!emulationFlowButtons) return;

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
    const modal = document.getElementById("config-modal") as HTMLElement | null;
    const btn = document.getElementById("settings-btn") as HTMLElement | null;
    const headerBtn = document.getElementById("settings-header") as HTMLElement | null;
    const closeBtn = document.getElementById("close-settings") as HTMLElement | null;

    if (modal && closeBtn && (btn || headerBtn)) {
      handleOpenModal(modal, [closeBtn], [btn!, headerBtn!]);
    }

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
    const canvas = this.cpu.gpu.screen as HTMLCanvasElement;

    canvas.width = 160;
    canvas.height = 144;
  }

  async #setInitScreenText() {
    const canvas = this.cpu.gpu.screen as HTMLCanvasElement;
    const color = localStorage.getItem(
      this.#settings.graphics.colorPalette.key
    );
    if (typeof document !== "undefined" && document.fonts) await document.fonts.ready;

    // Resize canvas to avoid blur
    const scale = 4;
    canvas.width = canvas.width * scale;
    canvas.height = canvas.height * scale;

    // Render text
    this.#updateInitScreenColor(color as string | null);
  }

  #renderText(text: string, color = "#000") {
    const ctx = this.cpu.gpu.context as CanvasRenderingContext2D;
    const canvas = ctx.canvas as HTMLCanvasElement;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "25px 'Press Start 2P'";
    ctx.fillStyle = color;

    const maxWidth = canvas.width * 0.8;
    const lineHeight = 30;

    const words = text.split(" ");
    const lines: string[] = [];
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

  #updateInitScreenColor(color: string | null) {
    const canvas = this.cpu.gpu.screen as HTMLCanvasElement;
    const ctx = this.cpu.gpu.context as CanvasRenderingContext2D;

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
    const emulationSpeed = this.#settings.game.emulationSpeed.value as HTMLSelectElement | null;

    if (!emulationSpeed) return;

    // Handle emulation speed change
    emulationSpeed.addEventListener("change", () => {
      this.#updateGameSpeed();
    });
  }

  #updateGameSpeed() {
    const emulationSpeed = this.#settings.game.emulationSpeed.value as HTMLSelectElement | null;
    if (!emulationSpeed) return;

    const newFrameRate =
      this.#defaultFrameRate / parseFloat((emulationSpeed as HTMLSelectElement).value);

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

    if (!volumeRange) return;

    const storedVolume = localStorage.getItem(key);

    // Set stored volume
    if (storedVolume) (volumeRange as HTMLInputElement).value = String(parseFloat(storedVolume));

    // Handle update volume
    volumeRange.addEventListener("input", () => {
      this.#updateVolume();
    });

    Object.values(this.#settings.audio.channels).forEach((ch: any) => {
      if (!ch || !ch.value) return;
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

    if (!volumeRange || !volumeValue) return;

    volumeValue.innerText = String(Math.round((volumeRange as HTMLInputElement).valueAsNumber * 100)); // Update visual value
    this.cpu.apu.masterVolume = (volumeRange as HTMLInputElement).valueAsNumber * this.cpu.apu.maxVolume; // Update APU volume
    localStorage.setItem(key, String((volumeRange as HTMLInputElement).valueAsNumber));
  }

  #updateActiveChannels(ch?: any) {
    if (!ch) {
      // All channels
      Object.values(this.#settings.audio.channels).forEach((ch: any) => {
        if (ch.value && ch.value.checked) {
          this.cpu.apu.unmute(ch.id);
          localStorage.setItem(ch.key, "true");
        } else {
          this.cpu.apu.mute(ch.id);
          localStorage.setItem(ch.key, "false");
        }
      });
    } else if (ch.value && ch.value.checked) {
      // Activate specific channel
      this.cpu.apu.unmute(ch.id);
      localStorage.setItem(ch.key, "true");
    } else {
      // Deactivate specific channel
      this.cpu.apu.mute(ch.id);
      localStorage.setItem(ch.key, "false");
    }
  }

  #handleGraphicsSettings() {
    const canvas = this.cpu.gpu.screen as HTMLCanvasElement;

    // Screen size. Default size determined by css or local storage
    const selectSize = this.#settings.graphics.screenSize.value as HTMLSelectElement | null;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const sizeValue = `${width}x${height}`;
    const halfSizeValue = `${Math.round(width / 2)}x${Math.round(height / 2)}`;
    const storedSize = localStorage.getItem(
      this.#settings.graphics.screenSize.key
    );

    if (selectSize)
      createSelectOption([
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
    const palette = this.#settings.graphics.colorPalette.value as HTMLSelectElement | null;
    const storedPalette = localStorage.getItem(
      this.#settings.graphics.colorPalette.key
    );

    if (palette && storedPalette) {
      palette.value = storedPalette;
      this.cpu.gpu.updatePalette(storedPalette);
    }

    if (palette) {
      palette.addEventListener("change", () => {
        this.#updateColorPalette();
      });
    }
  }

  #updateColorPalette() {
    const palette = this.#settings.graphics.colorPalette.value as HTMLSelectElement | null;
    if (!palette) return;

    this.cpu.gpu.updatePalette(palette.value);
    localStorage.setItem(
      this.#settings.graphics.colorPalette.key,
      palette.value
    );
    this.#updateInitScreenColor(palette.value);
  }

  #handleInterfaceSettings() {
    const selectColorTheme = this.#settings.interface.colorTheme.value as HTMLSelectElement | null;
    const selectShowButtons = this.#settings.interface.showButtons.value as HTMLInputElement | null;
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
      if (selectColorTheme) selectColorTheme.value = "light";
    }
    // Handle color theme change
    if (selectColorTheme)
      selectColorTheme.addEventListener("change", () => {
        localStorage.setItem(
          this.#settings.interface.colorTheme.key,
          selectColorTheme.value
        );
        root.classList.toggle("light", selectColorTheme.value == "light");
      });

    // Hide buttons if false stored
    if (storedShowButtons != null && storedShowButtons == "false") {
      if (selectShowButtons) selectShowButtons.checked = false;
      joypad.forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    }

    // Handle show buttons
    if (selectShowButtons)
      selectShowButtons.addEventListener("change", () => {
        localStorage.setItem(
          this.#settings.interface.showButtons.key,
          String(selectShowButtons.checked)
        );

        const display = selectShowButtons.checked ? "flex" : "none";
        joypad.forEach((el) => {
          (el as HTMLElement).style.display = display;
        });
      });
  }

  #handleJoypadSettings() {
    // Apply stored keys
    for (let i = 0; i < 8; i++) {
      const key = localStorage.getItem(String(i));
      if (key) this.#updateKeyboard({ id: i, value: key }, true);
    }

    const values = this.#settings.joypad.keyboard.values;
    if (values)
      (values as NodeListOf<HTMLInputElement>).forEach((key) => {
        key.addEventListener("click", () => {
          this.#updateKeyboard({ id: key.id, value: (key as HTMLInputElement).value });
        });
      });
  }

  #updateKeyboard(key: any, nonUserInput?: boolean) {
    const inputs = [...(this.#settings.joypad.keyboard.values as NodeListOf<HTMLInputElement>)].sort((a: any, b: any) =>
      a.id.localeCompare(b.id)
    );
    const input = inputs[key.id];

    const getRepeatedKey = (keyVal: string) => {
      const repeatedKey = inputs.filter((input2: any) => {
        return input2.value == keyVal;
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

    const pressKeyText = document.getElementById("press-key-text") as HTMLElement | null;

    const currentValue = key.value;

    if (pressKeyText) pressKeyText.style.visibility = "visible";
    input.value = "";
    input.classList.add("listening");

    window.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
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
          localStorage.setItem(String(key.id), pressedKey);
        }

        if (pressKeyText) pressKeyText.style.visibility = "hidden";
        input.classList.remove("listening");
      },
      { once: true }
    );
  }

  #handleResponsive() {
    const header = document.querySelector("header") as HTMLElement | null;
    const joypadLeftContainer = document.getElementById("joypad-left") as HTMLElement | null;
    const joypadRightContainer = document.getElementById("joypad-right") as HTMLElement | null;
    const portraitContainer = document.getElementById("portrait-container") as HTMLElement | null;
    const mainButtons = document.getElementById("main-buttons") as HTMLElement | null;
    const screenContainer = document.getElementsByClassName("screen-buttons")[0] as HTMLElement | undefined;
    const buttonsABContainer = document.getElementsByClassName("a-b")[0] as HTMLElement | undefined;
    const joypadPortraitContainer = document.createElement("div");
    joypadPortraitContainer.id = "joypad-portrait-container";

    const mobileLandscape = this.#isUserMobileAndLandscape();
    const mobilePortrait = this.#isUserScreenPortrait();

    const landscapeAction = (e: MediaQueryListEvent | MediaQueryList) => {
      if ((e as MediaQueryList).matches) {
        // Move header & buttons to joypad div
        if (joypadLeftContainer && header) {
          joypadLeftContainer.appendChild(header);
          if (mainButtons) joypadLeftContainer.appendChild(mainButtons);
        }
      } else {
        // Move header & buttons back to its position
        if (document.body && header) document.body.prepend(header);
        if (portraitContainer && mainButtons) portraitContainer.appendChild(mainButtons);
      }
    };

    const portraitAction = (e: MediaQueryListEvent | MediaQueryList) => {
      if ((e as MediaQueryList).matches) {
        // Display element in portrait format
        if (joypadLeftContainer && buttonsABContainer) joypadLeftContainer.append(buttonsABContainer);
        joypadPortraitContainer.appendChild(joypadLeftContainer!);
        joypadPortraitContainer.appendChild(joypadRightContainer!);
        if (portraitContainer) portraitContainer.appendChild(joypadPortraitContainer);
      } else {
        // Move elements to its original position
        if (joypadRightContainer && buttonsABContainer) joypadRightContainer.appendChild(buttonsABContainer);
        if (screenContainer && joypadLeftContainer) screenContainer.prepend(joypadLeftContainer);
        if (screenContainer && joypadRightContainer) screenContainer.appendChild(joypadRightContainer);
        joypadPortraitContainer.remove();
      }
    };

    mobileLandscape.addEventListener("change", landscapeAction as EventListener);
    landscapeAction(mobileLandscape as unknown as MediaQueryList);
    mobilePortrait.addEventListener("change", portraitAction as EventListener);
    portraitAction(mobilePortrait as unknown as MediaQueryList);
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

// Only auto-start in browser environment to keep module safe for Node imports
if (typeof document !== "undefined") new GameBoy();
