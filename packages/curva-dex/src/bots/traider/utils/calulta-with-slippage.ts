export function calculateWithSlippageSell(
    amount: bigint,
    basisPoints: bigint
) {
    return amount - (amount * basisPoints) / 10000n;
};

export function calculateWithSlippageBuy(
    amount: bigint,
    basisPoints: bigint
) {
    return amount + (amount * basisPoints) / 10000n;
};
