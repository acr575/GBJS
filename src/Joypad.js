import { resetBit, setBit, testBit } from "./GameBoyUtils.js";

export class Joypad {
  #cpu = null;
  #p1 = 0xff00;
  #buttons = ["J", "K", "SHIFT", "ENTER", "D", "A", "W", "S"];
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
    // Press key
    document.addEventListener("keydown", (event) => {
      const key = event.key.toUpperCase();
      this.#updateJoypad(this.#buttons.indexOf(key), 0);
    });

    // Release key
    document.addEventListener("keyup", (event) => {
      const key = event.key.toUpperCase();

      this.#updateJoypad(this.#buttons.indexOf(key), 1);
    });

    // Touch button
    this.#mobileButtons.forEach((button) => {
      document.getElementById(button).addEventListener("touchstart", () => {
        this.#updateJoypad(this.#mobileButtons.indexOf(button), 0);
      });
    });

    // Release touch
    this.#mobileButtons.forEach((button) => {
      document.getElementById(button).addEventListener("touchend", () => {
        this.#updateJoypad(this.#mobileButtons.indexOf(button), 1);
      });
    });
  }

  #updateJoypad(button, buttonState) {
    if (button == -1) return;
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
