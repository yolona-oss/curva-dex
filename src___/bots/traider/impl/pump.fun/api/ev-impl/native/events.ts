import { PublicKey } from "@solana/web3.js";

export type EventsType = "create" | "trade" | "complete";

export type CreateEvent = {
    signature: string;
    name: string;
    symbol: string;
    uri: string;
    mint: PublicKey;
    bondingCurve: PublicKey;
    user: PublicKey;
};

export type TradeEvent = {
    signature: string;
    mint: PublicKey;
    solAmount: bigint;
    tokenAmount: bigint;
    isBuy: boolean;
    user: PublicKey;
    timestamp: number;
    virtualSolReserves: bigint;
    virtualTokenReserves: bigint;
    realSolReserves: bigint;
    realTokenReserves: bigint;
};

export type CompleteEvent = {
    signature: string;
    user: PublicKey;
    mint: PublicKey;
    bondingCurve: PublicKey;
    timestamp: number;
};
