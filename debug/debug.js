import { CPU } from "../CPU.js";

const cpu = new CPU();
document
  .getElementById("fileInput")
  .addEventListener("change", async (event) => {
    const file = event.target.files[0];

    try {
      await cpu.LoadProgram(file);
      console.log("Memory after loading program:", cpu.mem);
    } catch (error) {
      console.error(error);
    }

    const title = cpu.mem.subarray(0x0134, 0x0143);
    console.log("Title: " + new TextDecoder().decode(title));

    const manufacturer = cpu.mem.subarray(0x013f, 0x0142);
    console.log("Manufacturer: " + new TextDecoder().decode(manufacturer));

    const licenseCode = cpu.mem.subarray(0x0144, 0x0145);
    console.log("License code: " + licenseCode);

    const sgbFlag = cpu.mem[0x0146];
    console.log("SGB flag: " + sgbFlag.toString(16));

    const cartridgeType = cpu.mem[0x0147];
    console.log("Cartridge type code: " + cartridgeType.toString(16));

    const romSize = cpu.mem[0x0148];
    console.log(
      "ROM size code: " +
        romSize.toString(16) +
        "; Size: " +
        32 * (1 << romSize) +
        " KiB"
    );

    const ramSize = cpu.mem[0x0149];
    console.log("RAM size code: " + ramSize.toString(16));

    const destination = cpu.mem[0x014a];
    console.log("Destination code: " + destination.toString(16));

    const oldLicensee = cpu.mem[0x014b];
    console.log("Old lincesee code: " + oldLicensee.toString(16));

    const romVersion = cpu.mem[0x014c];
    console.log("ROM version number: " + romVersion.toString(16));

    const checksum = cpu.mem[0x014d];
    console.log("Header checksum: " + checksum.toString(16));

    let computedChecksum = 0;
    for (let address = 0x0134; address <= 0x014c; address++) {
      computedChecksum = computedChecksum - cpu.mem[address] - 1;
    }
    console.log("Theorical Checksum: " + (computedChecksum & 0xff).toString(16));
  });
