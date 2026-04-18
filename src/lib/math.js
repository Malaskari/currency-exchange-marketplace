export const roundMoney = (amount, decimals = 2) => {
  return Math.round((amount + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const mul = (a, b, decimals = 2) => roundMoney(a * b, decimals);
export const div = (a, b, decimals = 2) => b !== 0 ? roundMoney(a / b, decimals) : 0;