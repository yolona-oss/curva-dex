import { PublicKey, SystemProgram } from '@solana/web3.js';

export const GLOBAL = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
export const FEE_RECIPIENT = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOC_TOKEN_ACC_PROG = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
export const RENT = new PublicKey("SysvarRent111111111111111111111111111111111");
export const PUMP_FUN_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
export const PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMP_FUN_ACCOUNT = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
export const SYSTEM_PROGRAM_ID = SystemProgram.programId;

export const BONDING_ADDR_SEED = new Uint8Array([98, 111, 110, 100, 105, 110, 103, 45, 99, 117, 114, 118, 101]);

export const PUMP_FUN_FRONTEND_API_URL = 'https://frontend-api-v3.pump.fun'
export const PUMP_FUN_SOCKET_API_URL = 'wss://frontend-api-v3.pump.fun/socket.io/?EIO=4&transport=websocket'

export const PUMPFUN_CREATE_LOG = "Program log: IX: Create Metadata Accounts v3";
export const PUMPFUN_BUY_LOG = "Program log: Instruction: Buy";
export const PUMPFUN_SELL_LOG = "Program log: Instruction: Sell";

export const PUMP_FUN_PROGRAM_BUY_INSTRUCTION = "16927863322537952870"
export const PUMP_FUN_PROGRAM_SELL_INSTRUCTION = "12502976635542562355"

export const GLOBAL_ACCOUNT_SEED = "global";
export const MINT_AUTHORITY_SEED = "mint-authority";
export const BONDING_CURVE_SEED = "bonding-curve";
export const METADATA_SEED = "metadata";
