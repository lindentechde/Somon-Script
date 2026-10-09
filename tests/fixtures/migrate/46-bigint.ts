// BigInt, exponent and numeric separators
const big = 2n ** 64n;
console.log(big.toString(), (big / 3n).toString(), (big % 7n).toString());
const sum: bigint = 1_000_000n + BigInt(5);
console.log(sum.toString(), typeof sum, BigInt.asIntN(8, 255n).toString());
console.log(2 ** 10, 10 ** -1, 1_234.5_6);
console.log(Number.MAX_SAFE_INTEGER, Number.isSafeInteger(2 ** 53));
