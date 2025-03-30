export const testBit = (val, bit) => {
  return ((val >> bit) & 1) == 1;
};

export const setBit = (val, bit) => {
  return val | (1 << bit);
};

export const resetBit = (val, bit) => {
  return val & ~(1 << bit);
};
