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
