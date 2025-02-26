import { BuiltInNames, TradeArchImplRegistry } from '@bots/traider'

//import { ExampleTradeApi, ExampleMaster, ExampleSlave } from '@bots/traider/impl/example'
import { PumpFunApiProvider, PumpFunMaster, PumpFunSlave } from '@bots/traider/impl/pump.fun'
import { SolanaWalletManager } from '@bots/traider/wallet-manager'

import { BLANK_ASSET_OBJ, BLANK_INSTANCE_ID_PREFIX, BLANK_WALLET_OBJ } from '@bots/traider/impl/built-in'

export function ImplRegistrySetup() {
    TradeArchImplRegistry.Instance.register(
        {
            name: BuiltInNames.PumpDotFun,
            api: PumpFunApiProvider,
            mtc: new PumpFunMaster(
                BLANK_CTRL_ID,
                BLANK_INSTANCE_ID_PREFIX,
                BLANK_ASSET_OBJ
            ),
            stc: new PumpFunSlave(
                BLANK_CTRL_ID,
                BLANK_INSTANCE_ID_PREFIX,
                BLANK_WALLET_OBJ
            ),
            walletManager: new SolanaWalletManager()
        }
    )
}
