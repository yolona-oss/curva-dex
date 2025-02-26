"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImplRegistrySetup = ImplRegistrySetup;
const traider_1 = require("@bots/traider");
const pump_fun_1 = require("@bots/traider/impl/pump.fun");
const wallet_manager_1 = require("@bots/traider/wallet-manager");
const built_in_1 = require("@bots/traider/impl/built-in");
function ImplRegistrySetup() {
    traider_1.TradeArchImplRegistry.Instance.register({
        name: traider_1.BuiltInNames.PumpDotFun,
        api: pump_fun_1.PumpFunApiProvider,
        mtc: new pump_fun_1.PumpFunMaster("___", built_in_1.BLANK_INSTANCE_ID_PREFIX, built_in_1.BLANK_ASSET_OBJ),
        stc: new pump_fun_1.PumpFunSlave("___", built_in_1.BLANK_INSTANCE_ID_PREFIX, built_in_1.BLANK_WALLET_OBJ),
        walletManager: new wallet_manager_1.SolanaWalletManager()
    });
}
