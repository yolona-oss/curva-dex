"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountResolver = void 0;
const web3_js_1 = require("@solana/web3.js");
const solana_1 = require("@core/providers/solana");
const bc_account_1 = require("./bc-account");
const global_account_1 = require("./global-account");
const constants_1 = require("../constants");
const spl_token_1 = require("@solana/spl-token");
class AccountResolver {
    static async getBondingCurveAccount(mint, commitment = solana_1.DEFAULT_COMMITMENT) {
        const tokenAccount = await solana_1.SolanaProvider.Instance.Connection.getAccountInfo(AccountResolver.getBondingCurvePDA(mint), commitment);
        if (!tokenAccount) {
            return null;
        }
        return bc_account_1.BondingCurveAccount.fromBuffer(tokenAccount.data);
    }
    static async getGlobalAccount() {
        const [globalAccountPDA] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_ACCOUNT_SEED)], constants_1.PUMP_FUN_PROGRAM);
        const tokenAccount = await solana_1.SolanaProvider.Instance.Connection.getAccountInfo(globalAccountPDA);
        return global_account_1.GlobalAccount.fromBuffer(tokenAccount.data);
    }
    static getBondingCurvePDA(mint) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.BONDING_CURVE_SEED), mint.toBuffer()], constants_1.PUMP_FUN_PROGRAM)[0];
    }
    static async getTokenBondingCurve(mintStr) {
        const mint = new web3_js_1.PublicKey(mintStr);
        let [bonding] = web3_js_1.PublicKey.findProgramAddressSync([constants_1.BONDING_ADDR_SEED, mint.toBuffer()], constants_1.PUMP_FUN_PROGRAM);
        let [assoc_bonding_addr] = web3_js_1.PublicKey.findProgramAddressSync([bonding.toBuffer(), constants_1.PUMP_FUN_PROGRAM.toBuffer(), mint.toBuffer()], spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
        return {
            bonding_curve: bonding.toString(),
            associated_bonding_curve: assoc_bonding_addr.toString()
        };
    }
}
exports.AccountResolver = AccountResolver;
