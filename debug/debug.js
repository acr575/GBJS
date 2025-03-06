import { CPU } from "../src/CPU.js";
import { Disassembler } from "../src/Disassembler.js";

const cpu = new CPU();
const disassembler = new Disassembler(cpu);
cpu.init();
cpu.updateDebugBox();
cpu.mmu.setupAddressInput();

document
  .getElementById("fileInput")
  .addEventListener("change", async (event) => {
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

    disassembler.disassemble(fileSize);

    cpu.emulateFrame();

    // const frameRate = 1000 / 59.7; // En milisegundos

    // setInterval(() => {
    //   // Llamada a emulateFrame, ejecuta un frame cada 1/59.7 segundos
    //   cpu.emulateFrame();
    // }, frameRate);
  });
