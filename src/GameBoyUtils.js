export const testBit = (val, bit) => {
  return ((val >> bit) & 1) == 1;
};

export const setBit = (val, bit) => {
  return val | (1 << bit);
};

export const resetBit = (val, bit) => {
  return val & ~(1 << bit);
};

// https://stackoverflow.com/questions/56577958/how-to-convert-one-byte-8-bit-to-signed-integer-in-javascript
export const getSignedByte = (value) => {
  return (value << 24) >> 24;
};

export const getSignedWord = (value) => {
  return (value << 16) >> 16;
};

export const createSelectOption = (options, select) => {
  if (!select) return;

  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.text = option.text;
    optionElement.value = option.value;
    select.appendChild(optionElement);
  });
};

export const handleOpenModal = (modal, closeBtn, openBtns) => {
  // When the user clicks on the button, open the modal
  openBtns.forEach((btn) => {
    btn.onclick = function () {
      modal.style.display = "block";
    };
  });

  // When user press escape, close the modal
  document.addEventListener("keydown", (event) => {
    if (event.key == "Escape") modal.style.display = "none";
  });

  // When the user clicks on <span> (x), close the modal
  closeBtn.forEach((btn) => {
    btn.onclick = function () {
      modal.style.display = "none";
    };
  });

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
};

export const closeActiveModals = () => {
  const modals = document.querySelectorAll(".modal");
  Array.from(modals).map((modal) => (modal.style.display = "none"));
};
