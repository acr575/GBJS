# GBJS — Game Boy Emulator in JavaScript

A cycle-accurate Game Boy (DMG) emulator that runs entirely in the browser, built from scratch in vanilla JavaScript using HTML5 Canvas and the Web Audio API. No plugins. No dependencies beyond a modern browser.

![GBJS](https://img.shields.io/badge/platform-browser-blue) ![JavaScript](https://img.shields.io/badge/language-JavaScript-yellow) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Full CPU emulation** — Complete LR35902 instruction set (500+ opcodes including the `0xCB`-prefixed table), accurate flag handling, interrupt system (IME, EI/DI), and HALT/STOP behaviour.
- **PPU / Graphics** — Pixel-accurate rendering of backgrounds, window layer, and sprites via an HTML5 `<canvas>`. Supports all four PPU modes (OAM Search, Pixel Transfer, H-Blank, V-Blank) with correct timing.
- **Memory Banking** — Support for ROM-only cartridges, MBC1, and MBC5, enabling games beyond the base 32 KiB ROM limit. External RAM banking also implemented.
- **Audio (APU)** — Three of the four Game Boy sound channels implemented using the Web Audio API: CH1 (square wave with sweep), CH2 (square wave), and CH3 (wave channel). Per-channel mute and master volume control.
- **Timer** — Full DIV, TIMA, TMA, and TAC register emulation with correct overflow and interrupt behaviour.
- **Joypad** — Keyboard and on-screen touch controls. Fully remappable key bindings persisted via localStorage.
- **Colour palettes** — Classic Game Boy green palette and greyscale palette, switchable at runtime.
- **Emulation speed control** — Adjustable frame rate multiplier for slow-motion or fast-forward play.
- **Responsive UI** — Adapts layout for desktop, mobile portrait, and mobile landscape orientations.

---

## Supported ROM Formats

| Extension | Description              |
|-----------|--------------------------|
| `.gb`     | Game Boy (DMG) ROMs      |
| `.gbc`    | Game Boy Color ROMs (DMG compatibility mode) |
| `.bin`    | Raw binary ROM images    |

---

## Architecture

The emulator is structured as a set of ES6 modules, each mapping to a physical subsystem of the original hardware:

```
src/
├── GameBoy.js        # Top-level orchestrator: UI, settings, emulation loop
├── CPU.js            # LR35902 CPU core: registers, fetch/decode/execute, interrupts
├── OpcodeTable.js    # Full opcode dispatch table (~500 instructions + CB-prefixed set)
├── GPU.js            # PPU: scanline renderer, OAM, VRAM, DMA, STAT interrupts
├── MMU.js            # Memory bus: ROM loading, MBC1/MBC5, WRAM, HRAM, I/O registers
├── Timer.js          # DIV/TIMA/TMA/TAC registers and timer interrupt
├── Joypad.js         # Button state, keyboard mapping, joypad register
├── GameBoyUtils.js   # Shared bit-manipulation helpers
└── APU/
    ├── APU.js        # Audio master: NR50/NR51/NR52, channel routing, Web Audio graph
    ├── CH1.js        # Square wave channel with frequency sweep
    ├── CH2.js        # Square wave channel
    ├── CH3.js        # Programmable wave channel
    └── CH4.js        # Noise channel (in progress)
```

### Emulation loop

Each frame, the CPU drives the system clock at **4,194,304 Hz**. The main loop runs synchronously until the PPU signals a V-Blank, at which point the completed frame is flushed to the canvas:

```
while (!vBlank) {
    cycles = cpu.execInstruction();
    timer.update(cycles);
    vBlank = ppu.updateGraphics(cycles);
    apu.updateAudio(cycles);
}
```

The loop is called via `setInterval` at the native Game Boy frame rate (~59.7 fps), with an adjustable multiplier for speed control.

---

## Getting Started

No build step required — the project uses native ES6 modules.

```bash
git clone https://github.com/acr575/GBJS.git
cd GBJS
```

Then serve the directory with any static file server. For example, with Python:

```bash
python3 -m http.server 8080
```

Or with Node.js:

```bash
npx serve .
```

Open `http://localhost:8080` in your browser, click **Load game**, and select a `.gb` ROM file.

> **Note:** Due to browser security restrictions (`type="module"` scripts), the emulator cannot be opened directly as a local `file://` URL — a local server is required.

---

## Controls

Default keyboard mapping (fully remappable in Settings):

| Game Boy Button | Default Key |
|-----------------|-------------|
| D-Pad Up        | `W`         |
| D-Pad Down      | `S`         |
| D-Pad Left      | `A`         |
| D-Pad Right     | `D`         |
| A               | `K`         |
| B               | `J`         |
| Start           | `Enter`     |
| Select          | `Shift`     |

On mobile, on-screen buttons are available and can be toggled in the settings panel.

---

## Settings

The settings panel (gear icon) exposes the following options:

| Category  | Option              | Description                                      |
|-----------|---------------------|--------------------------------------------------|
| Graphics  | Screen size         | Toggle between 1× and 2× render scale            |
| Graphics  | Colour palette      | Classic green or greyscale                       |
| Audio     | Master volume       | Global volume slider                             |
| Audio     | Channel toggle      | Enable/disable CH1, CH2, CH3 independently      |
| Game      | Emulation speed     | Frame rate multiplier (0.5×, 1×, 2×, ...)       |
| Interface | Colour theme        | Dark / Light UI                                  |
| Interface | Show buttons        | Toggle on-screen joypad visibility               |
| Joypad    | Key bindings        | Remap each button to any keyboard key            |

All settings are persisted in `localStorage`.

---

## Implementation Notes

- **No BIOS required.** The CPU initialises registers to post-boot values (`AF=0x01B0`, `BC=0x0013`, `DE=0x00D8`, `HL=0x014D`) so commercial ROMs run without a boot ROM.
- **OAM DMA** is handled via the `0xFF46` register write, copying 160 bytes from the specified source address into OAM.
- **CH4 (noise channel)** is present in the codebase but currently commented out, leaving audio mostly complete for music-heavy games.
- The PPU implements the **STAT interrupt** for all three configurable sources (H-Blank, V-Blank, OAM).

---

## Known Limitations

- Game Boy Color (GBC) extended features are not emulated (CGBP palettes, double-speed mode, HDMA).
- CH4 (noise channel) not yet active.
- MBC2 and MBC3 (RTC) not implemented; only MBC1 and MBC5 are supported.
- Save states / battery-backed SRAM not yet persisted to disk.

---

## Project Background

GBJS was developed as a Final Degree Project in Computer Science. The goal was to implement a functionally accurate Game Boy emulator from scratch in JavaScript, targeting the browser as the sole runtime — no native code, no WebAssembly, no external emulation libraries.

Key references used during development:
- [Pan Docs](https://gbdev.io/pandocs/) — the definitive Game Boy technical reference
- [Game Boy CPU Manual](http://marc.rawer.de/Gameboy/Docs/GBCPUman.pdf)
- [The Ultimate Game Boy Talk (CCC)](https://www.youtube.com/watch?v=HyzD8pNlpwI)

---

## License

MIT — see [LICENSE](LICENSE) for details.
