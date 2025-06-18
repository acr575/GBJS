import { resetBit, setBit, testBit } from "./GameBoyUtils.js";

export class Joypad {
  #cpu = null;
  #p1 = 0xff00;
  buttons = ["J", "K", "SHIFT", "ENTER", "D", "A", "W", "S"];
  #mobileButtons = [
    "joypad-a",
    "joypad-b",
    "joypad-select",
    "joypad-start",
    "dpad-right",
    "dpad-left",
    "dpad-up",
    "dpad-down",
  ];
  #state = 0xff;

  constructor(cpu) {
    this.#cpu = cpu;

    this.#handleInput();
  }

  #handleInput() {
    const buttons = document.querySelectorAll(".touchable");
    const buttonsMap = new Map();
    buttons.forEach((button) => buttonsMap.set(button.id, button));

    const buttonsIds = this.#mobileButtons.reduce((acc, id) => {
      if (buttonsMap.has(id)) {
        acc[id] = buttonsMap.get(id);
      }
      return acc;
    }, {});

    // Key pressed
    document.addEventListener("keydown", (event) => {
      const key = this.buttons.indexOf(event.key.toUpperCase());
      if (key == -1) return;
      const id = this.#mobileButtons[key];
      buttonsIds[id]?.classList.add("touched");
      this.#updateJoypad(key, 0);
    });

    document.addEventListener("keyup", (event) => {
      const key = this.buttons.indexOf(event.key.toUpperCase());
      if (key == -1) return;
      const id = this.#mobileButtons[key];
      buttonsIds[id]?.classList.remove("touched");
      this.#updateJoypad(key, 1);
    });

    // Touch & mouse click
    this.#mobileButtons.forEach((id, index) => {
      const el = buttonsIds[id];
      if (!el) return;

      const press = () => {
        el.classList.add("touched");
        this.#updateJoypad(index, 0);
      };
      const release = () => {
        el.classList.remove("touched");
        this.#updateJoypad(index, 1);
      };

      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        press();
      });
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        press();
      });

      el.addEventListener("touchend", (e) => {
        e.preventDefault();
        release();
      });
      el.addEventListener("touchcancel", (e) => {
        e.preventDefault();
        release();
      });
      el.addEventListener("mouseup", (e) => {
        e.preventDefault();
        release();
      });
    });
  }

  #updateJoypad(button, buttonState) {
    const currentState = this.#state;
    const updatedState = buttonState
      ? setBit(currentState, button)
      : resetBit(currentState, button);

    this.#state = updatedState; // Update internal state

    // If button state changed from 1 to 0, joypad interrupt
    if (testBit(currentState, button) && !testBit(updatedState, button))
      this.#cpu.requestInterrupt(4);
  }

  #areButtonsEnabled() {
    return !testBit(this.#cpu.mmu.ioRegs[this.#p1 & 0x7f], 5);
  }

  #isDpadEnabled() {
    return !testBit(this.#cpu.mmu.ioRegs[this.#p1 & 0x7f], 4);
  }

  readJoypad() {
    const currentP1 = this.#cpu.mmu.ioRegs[this.#p1 & 0x7f];

    // Read buttons (upper state nibble)
    if (this.#areButtonsEnabled()) {
      return (currentP1 & 0xf0) | (this.#state & 0xf);
    }

    // Read d-pad (lower state nibble)
    else if (this.#isDpadEnabled()) {
      return (currentP1 & 0xf0) | (this.#state >> 4);
    }

    // None enabled return 0xF
    return currentP1 | 0xf;
  }

  // Update joypad register. Only upper nibble writeable
  writeByte(addr, val) {
    this.#cpu.mmu.ioRegs[addr] =
      (this.#cpu.mmu.ioRegs[addr] & 0x0f) | (val & 0xf0);
  }
}
