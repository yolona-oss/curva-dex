import { Commitment, PublicKey } from "@solana/web3.js";
import { DEFAULT_COMMITMENT, SolanaProvider } from "@core/providers/solana";
import { BondingCurveAccount } from "./bc-account";
import { GlobalAccount } from "./global-account";
import { BONDING_ADDR_SEED, BONDING_CURVE_SEED, GLOBAL_ACCOUNT_SEED, PUMP_FUN_PROGRAM } from "../constants";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

export class AccountResolver {
    static async getBondingCurveAccount(
        mint: PublicKey,
        commitment: Commitment = DEFAULT_COMMITMENT
    ) {
        const tokenAccount = await SolanaProvider.Instance.Connection.getAccountInfo(
            AccountResolver.getBondingCurvePDA(mint), commitment
        );
        if (!tokenAccount) {
            return null;
        }
        return BondingCurveAccount.fromBuffer(tokenAccount!.data);
    }

    static async getGlobalAccount() {
        const [globalAccountPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from(GLOBAL_ACCOUNT_SEED)],
            PUMP_FUN_PROGRAM
        );

        const tokenAccount = await SolanaProvider.Instance.Connection.getAccountInfo(
            globalAccountPDA
        );

        return GlobalAccount.fromBuffer(tokenAccount!.data);
    }

    private static getBondingCurvePDA(mint: PublicKey) {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
            PUMP_FUN_PROGRAM
        )[0];
    }

    static async getTokenBondingCurve(mintStr: string) {
        const mint = new PublicKey(mintStr)
        let [bonding] = PublicKey.findProgramAddressSync([BONDING_ADDR_SEED, mint.toBuffer()], PUMP_FUN_PROGRAM);
        let [assoc_bonding_addr] = PublicKey.findProgramAddressSync([bonding.toBuffer(), PUMP_FUN_PROGRAM.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID);
        return {
            bonding_curve: bonding.toString(),
            associated_bonding_curve: assoc_bonding_addr.toString()
        }
    }


}
