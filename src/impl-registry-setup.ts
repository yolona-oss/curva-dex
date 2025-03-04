import { BuiltInTradeArchNames, TradeArchImplRegistry } from '@bots/traider'

//import { ExampleTradeApi, ExampleMaster, ExampleSlave } from '@bots/traider/impl/example'
import { PumpFunApiProvider, PumpFunMaster, PumpFunSlave } from '@bots/traider/impl/pump.fun'
import { SolanaWalletManager } from '@bots/traider/wallet-manager'

import {
    BLANK_ASSET_OBJ,
    BLANK_CTRL_ID,
    BLANK_WALLET_OBJ
} from '@bots/traider/impl/built-in'

export function ImplRegistrySetup() {
    TradeArchImplRegistry.Instance.register(
        {
            name: BuiltInTradeArchNames.PumpDotFun,
            api: PumpFunApiProvider,
            mtc: new PumpFunMaster(
                BLANK_CTRL_ID,
                null,
                BLANK_ASSET_OBJ,
                []
            ),
            stc: new PumpFunSlave(
                BLANK_CTRL_ID,
                null,
                BLANK_WALLET_OBJ,
                null
            ),
            walletManager: new SolanaWalletManager()
        }
    )
}
