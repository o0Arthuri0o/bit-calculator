export type ArmFlags = {
  N: number;
  Z: number;
  C: number;
  V: number;
};

export type ArmOpResult = {
  result: number;
  flags: ArmFlags;
};

const MASK32 = 0xffffffff;
const SIGN_BIT = 0x80000000;

const toInt32 = (value: number) => value | 0;
const toUint32 = (value: number) => value >>> 0;

const packFlags = (result: number, carry: number, overflow: number): ArmFlags => ({
  N: result < 0 ? 1 : 0,
  Z: result === 0 ? 1 : 0,
  C: carry,
  V: overflow,
});

const addBase = (a: number, b: number, carryIn: number) => {
  const ua = toUint32(a);
  const ub = toUint32(b);
  const cin = carryIn ? 1 : 0;

  const sum = ua + ub + cin;
  const result = toInt32(sum & MASK32);
  const carryOut = sum > MASK32 ? 1 : 0;
  const overflow = (~(ua ^ ub) & (ua ^ toUint32(result)) & SIGN_BIT) !== 0 ? 1 : 0;

  return { result, carryOut, overflow };
};

const subBase = (a: number, b: number, borrow: number) => {
  const ua = toUint32(a);
  const ub = toUint32(b);
  const bin = borrow ? 1 : 0;

  const diff = ua - ub - bin;
  const result = toInt32(diff & MASK32);
  const carryOut = diff >= 0 ? 1 : 0; // ARM: C=1 если займа не было
  const overflow = ((toInt32(a) ^ toInt32(b)) & (toInt32(a) ^ result) & SIGN_BIT) !== 0 ? 1 : 0;

  return { result, carryOut, overflow };
};

export const add = (a: number, b: number): ArmOpResult => {
  const { result, carryOut, overflow } = addBase(a, b, 0);
  return { result, flags: packFlags(result, carryOut, overflow) };
};

export const adc = (a: number, b: number, carryFlag: number): ArmOpResult => {
  const { result, carryOut, overflow } = addBase(a, b, carryFlag);
  return { result, flags: packFlags(result, carryOut, overflow) };
};

export const sub = (a: number, b: number): ArmOpResult => {
  const { result, carryOut, overflow } = subBase(a, b, 0);
  return { result, flags: packFlags(result, carryOut, overflow) };
};

export const sbc = (a: number, b: number, carryFlag: number): ArmOpResult => {
  const { result, carryOut, overflow } = subBase(a, b, 1 - (carryFlag ? 1 : 0));
  return { result, flags: packFlags(result, carryOut, overflow) };
};

export const rsb = (a: number, b: number): ArmOpResult => {
  const { result, carryOut, overflow } = subBase(b, a, 0);
  return { result, flags: packFlags(result, carryOut, overflow) };
};

export const rsc = (a: number, b: number, carryFlag: number): ArmOpResult => {
  const { result, carryOut, overflow } = subBase(b, a, 1 - (carryFlag ? 1 : 0));
  return { result, flags: packFlags(result, carryOut, overflow) };
};

export const cmp = (a: number, b: number): ArmOpResult => {
  const { result, carryOut, overflow } = subBase(a, b, 0);
  return { result, flags: packFlags(result, carryOut, overflow) };
};


