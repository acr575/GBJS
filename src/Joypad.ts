import { resetBit, setBit, testBit } from "./GameBoyUtils.ts";

export class Joypad {
  // TODO: Replace `any` with a proper CPU type
  #cpu: any = null;
  #p1: number = 0xff00;
  // Using `any[]` for compatibility with existing code that indexes by string IDs
  // TODO: tighten types (e.g. Array<string | null>)
  buttons: any[] = ["J", "K", "SHIFT", "ENTER", "D", "A", "W", "S"];
  #mobileButtons: string[] = [
    "joypad-a",
    "joypad-b",
    "joypad-select",
    "joypad-start",
    "dpad-right",
    "dpad-left",
    "dpad-up",
    "dpad-down",
  ];
  #state: number = 0xff;

  constructor(cpu: any) {
    this.#cpu = cpu;

    // Attach UI only when running in a browser environment
    if (typeof document !== "undefined") {
      this.initUI();
    }
  }

  // Public method to initialize DOM bindings (useful for testing or manual mounting)
  initUI() {
    this.#handleInput();
  }

  #handleInput() {
    if (typeof document === "undefined") return;

    const buttons = document.querySelectorAll(".touchable") as NodeListOf<HTMLElement>;
    const buttonsMap = new Map<string, HTMLElement>();
    buttons.forEach((button) => buttonsMap.set(button.id, button));

    const buttonsIds: { [id: string]: HTMLElement } = this.#mobileButtons.reduce((acc: any, id) => {
      if (buttonsMap.has(id)) {
        acc[id] = buttonsMap.get(id)!;
      }
      return acc;
    }, {});

    // Key pressed
    document.addEventListener("keydown", (event: KeyboardEvent) => {
      const keyStr = (event && (event as KeyboardEvent).key) ? (event as KeyboardEvent).key.toUpperCase() : "";
      const key = this.buttons.indexOf(keyStr);
      if (key == -1) return;
      const id = this.#mobileButtons[key];
      buttonsIds[id]?.classList.add("touched");
      this.#updateJoypad(key, 0);
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      const keyStr = (event && (event as KeyboardEvent).key) ? (event as KeyboardEvent).key.toUpperCase() : "";
      const key = this.buttons.indexOf(keyStr);
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

      el.addEventListener("touchstart", (e: TouchEvent) => {
        e.preventDefault();
        press();
      });
      el.addEventListener("mousedown", (e: MouseEvent) => {
        e.preventDefault();
        press();
      });

      el.addEventListener("touchend", (e: TouchEvent) => {
        e.preventDefault();
        release();
      });
      el.addEventListener("touchcancel", (e: TouchEvent) => {
        e.preventDefault();
        release();
      });
      el.addEventListener("mouseup", (e: MouseEvent) => {
        e.preventDefault();
        release();
      });
    });
  }

  #updateJoypad(button: number, buttonState: number) {
    const currentState = this.#state;
    const updatedState =
      buttonState === 1 ? setBit(currentState, button) : resetBit(currentState, button);

    this.#state = updatedState; // Update internal state

    // If button state changed from 1 to 0, joypad interrupt
    if (testBit(currentState, button) && !testBit(updatedState, button)) {
      // cpu is typed as any; requestInterrupt is part of the CPU API
      this.#cpu.requestInterrupt(4);
    }
  }

  #areButtonsEnabled() {
    return !testBit(this.#cpu.mmu.ioRegs[this.#p1 & 0x7f], 5);
  }

  #isDpadEnabled() {
    return !testBit(this.#cpu.mmu.ioRegs[this.#p1 & 0x7f], 4);
  }

  readJoypad(): number {
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
  writeByte(addr: number, val: number) {
    this.#cpu.mmu.ioRegs[addr] =
      (this.#cpu.mmu.ioRegs[addr] & 0x0f) | (val & 0xf0);
  }
}
