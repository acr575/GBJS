// Converted to TypeScript - utility helpers used across the emulator

export const testBit = (val: number, bit: number): boolean => {
  return ((val >> bit) & 1) === 1;
};

export const setBit = (val: number, bit: number): number => {
  return val | (1 << bit);
};

export const resetBit = (val: number, bit: number): number => {
  return val & ~(1 << bit);
};

// https://stackoverflow.com/questions/56577958/how-to-convert-one-byte-8-bit-to-signed-integer-in-javascript
export const getSignedByte = (value: number): number => {
  return (value << 24) >> 24;
};

export const getSignedWord = (value: number): number => {
  return (value << 16) >> 16;
};

export const createSelectOption = (
  options: { text: string; value: string }[],
  select?: HTMLSelectElement | null
): void => {
  if (!select) return;

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.text = option.text;
    optionElement.value = option.value;
    select.appendChild(optionElement);
  });
};

export const handleOpenModal = (
  modal: HTMLElement,
  closeBtn: NodeListOf<HTMLElement>,
  openBtns: HTMLElement[]
): void => {
  // When the user clicks on the button, open the modal
  openBtns.forEach((btn) => {
    btn.onclick = function () {
      modal.style.display = "block";
    };
  });

  // When user press escape, close the modal
  document.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape") modal.style.display = "none";
  });

  // When the user clicks on <span> (x), close the modal
  closeBtn.forEach((btn) => {
    btn.onclick = function () {
      modal.style.display = "none";
    };
  });

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if ((event.target as HTMLElement) === modal) {
      modal.style.display = "none";
    }
  };
};

export const closeActiveModals = (): void => {
  const modals = document.querySelectorAll(".modal");
  Array.from(modals).map((modal) => ((modal as HTMLElement).style.display = "none"));
};
