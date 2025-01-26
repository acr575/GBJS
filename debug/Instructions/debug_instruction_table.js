import { CPU } from "../../CPU.js";

let cpu = new CPU();

const emptyOpcodes = [
  0xd3, 0xdb, 0xdd, 0xe3, 0xe4, 0xeb, 0xec, 0xed, 0xf4, 0xfc, 0xfd,
];

const body = document.getElementsByTagName("body")[0]; // Accede al primer (y único) <body>
body.innerHTML += `<div class="buttons"><button id="common">Common instructions</button><button id="prefixed">Prefix CB instructions</button></div>`;
const common = document.getElementById("common");
const prefixed = document.getElementById("prefixed");

common.addEventListener("click", () => {
  console.clear();
  for (let opcode = 0; opcode <= 0xff; opcode++) {
    if (emptyOpcodes.includes(opcode)) continue;
    const fetch = cpu.instructionTable[opcode];
    if (!fetch) throw new Error("Unknown opcode: 0x" + opcode.toString(16));
    console.log("Opcode: 0x" + opcode.toString(16));
    fetch.instruction();
    console.log(
      "\tFunction: " +
        fetch.instruction +
        "\n\tLength: " +
        fetch.length +
        "\n\tCycles: " +
        (typeof fetch.cycles === "function" ? fetch.cycles() : fetch.cycles)
    );
  }
});

prefixed.addEventListener("click", () => {
  console.clear();
  for (let opcode = 0; opcode <= 0xff; opcode++) {
    cpu.setRegister("HL", 0xc555);
    const fetch = cpu.prefixInstructionTable[opcode];
    if (!fetch) throw new Error("Unknown opcode: 0x" + opcode.toString(16));
    console.log("Opcode: 0x" + opcode.toString(16));
    fetch.instruction();
    console.log(
      "\tFunction: " +
        fetch.instruction +
        "\n\tCycles: " +
        (fetch.cycles ? fetch.cycles : 8)
    );
  }
});
