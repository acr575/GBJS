import { CPU } from "../src/CPU.js";

let cpu = new CPU();

let interval = null;

const reset = () => {
  Object.keys(cpu).forEach((property) => {
    cpu[property] = null;
  });
  cpu = null;
};

const fetchRom = async (url) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ROM: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    const file = new File([blob], "rom.gb", {
      type: "application/octet-stream",
    });

    clearInterval(interval);
    reset();
    cpu = new CPU();
    await cpu.mmu.load(file);

    return cpu;
  } catch (error) {
    console.error("Error loading ROM:", error);
  }
};

const run = (cpu) => {
  const frameRate = 1000 / 60;

  interval = setInterval(() => {
    cpu.emulateFrame();
  }, frameRate);
};

// Run boot rom
document
  .getElementById("boot-rom-button")
  .addEventListener("click", async () => {
    const program = await fetchRom(
      "https://raw.githubusercontent.com/acr575/GBJS/release-test-cpu-instrs-boot-rom/roms/dmg_boot_rom/dmg_boot.bin"
    );

    if (!program) throw new Error("Failed to load boot rom");

    program.pc = 0;

    // BIOS expect nintendo logo to be in memory
    const nintendoLogo = [
      0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b, 0x03, 0x73, 0x00, 0x83,
      0x00, 0x0c, 0x00, 0x0d, 0x00, 0x08, 0x11, 0x1f, 0x88, 0x89, 0x00, 0x0e,
      0xdc, 0xcc, 0x6e, 0xe6, 0xdd, 0xdd, 0xd9, 0x99, 0xbb, 0xbb, 0x67, 0x63,
      0x6e, 0x0e, 0xec, 0xcc, 0xdd, 0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e,
    ];

    // Load Nintendo logo
    let memAddr = 0x104;
    for (let i = 0; i < nintendoLogo.length; i++) {
      program.mmu.rom[memAddr++] = nintendoLogo[i];
    }

    run(program);
  });

// Run CPU test rom
const baseUrl =
  "https://raw.githubusercontent.com/acr575/GBJS/release-test-cpu-instrs-boot-rom/roms/blargg/cpu_instrs/";
const testButtons = document.getElementsByClassName("test-button");

[...testButtons].forEach((test) => {
  test.addEventListener("click", async () => {
    const romUrl = baseUrl.concat(encodeURIComponent(test.name));
    const program = await fetchRom(romUrl);
    if (!program) throw new Error("Failed to load rom");
    run(program);
  });
});

// Run loaded file
document
  .getElementById("fileInput")
  .addEventListener("change", async (event) => {
    clearInterval(interval);
    reset();
    cpu = new CPU();
    cpu.init();
    const file = event.target.files[0];
    let fileSize = 0;
    try {
      fileSize = await cpu.mmu.load(file);
      console.log("Memory after loading program:", cpu.mmu.rom);
    } catch (error) {
      console.error(error);
    }

    const title = cpu.mmu.rom.subarray(0x0134, 0x0143);
    console.log("Title: " + new TextDecoder().decode(title));

    const manufacturer = cpu.mmu.rom.subarray(0x013f, 0x0142);
    console.log("Manufacturer: " + new TextDecoder().decode(manufacturer));

    const licenseCode = cpu.mmu.rom.subarray(0x0144, 0x0145);
    console.log("License code: " + licenseCode);

    const sgbFlag = cpu.mmu.rom[0x0146];
    console.log("SGB flag: " + sgbFlag.toString(16));

    const cartridgeType = cpu.mmu.rom[0x0147];
    console.log("Cartridge type code: " + cartridgeType.toString(16));

    const romSize = cpu.mmu.rom[0x0148];
    console.log(
      "ROM size code: " +
        romSize.toString(16) +
        "; Size: " +
        32 * (1 << romSize) +
        " KiB"
    );

    const ramSize = cpu.mmu.rom[0x0149];
    console.log("RAM size code: " + ramSize.toString(16));

    const destination = cpu.mmu.rom[0x014a];
    console.log("Destination code: " + destination.toString(16));

    const oldLicensee = cpu.mmu.rom[0x014b];
    console.log("Old lincesee code: " + oldLicensee.toString(16));

    const romVersion = cpu.mmu.rom[0x014c];
    console.log("ROM version number: " + romVersion.toString(16));

    const checksum = cpu.mmu.rom[0x014d];
    console.log("Header checksum: " + checksum.toString(16));

    let computedChecksum = 0;
    for (let address = 0x0134; address <= 0x014c; address++) {
      computedChecksum = computedChecksum - cpu.mmu.rom[address] - 1;
    }

    console.log(
      "Theorical Checksum: " + (computedChecksum & 0xff).toString(16)
    );

    run(cpu);
  });
