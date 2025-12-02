// api/utils/numbers.js
export const validMethods = ["cashapp", "paypal", "chime"];

export const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
