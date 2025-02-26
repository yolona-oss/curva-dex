"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BondCurvPump_Robot = exports.serviceArgs = exports.serviceDescription = exports.serviceName = void 0;
const web3_js_1 = require("@solana/web3.js");
const traider_1 = require("@bots/traider");
const command_handler_1 = require("@core/command-handler");
const pump_fun_config_1 = require("./pump.fun.config");
const logger_1 = __importDefault(require("@utils/logger"));
exports.serviceName = 'bond_curv_pump';
const slaveHolder_Signature = "_holder_";
const slaveTraider_Signature = "_traider_";
exports.serviceDescription = `Customizable servie for the pump.fun dex simulation activity and automated trading by setting a strategy schema.`;
exports.serviceArgs = ["session-id"];
class RobotStateMngr {
    constructor() {
    }
}
class BondCurvPump_Robot extends command_handler_1.BaseCommandService {
    impl;
    master;
    sessionState;
    constructor(userId, config = pump_fun_config_1.defaultCfg, name = exports.serviceName) {
        const _config = { ...pump_fun_config_1.defaultCfg, ...config };
        super(userId, _config, name);
        this.sessionState = new RobotStateMngr();
        this.impl = traider_1.TradeArchImplRegistry.Instance.get(traider_1.BuiltInNames.PumpDotFun);
        this.master = this.impl.mtc.clone(`${this.createServicePrefix()}_master_0_id`, this.userId, this.config.targetAsset);
    }
    clone(userId, newName = exports.serviceName) {
        return new BondCurvPump_Robot(userId, Object.assign({}, this.config), newName);
    }
    loadInitParams(...args) {
        if (args.length == 1) {
            let session_id = args[0];
            if (session_id.length > 0) {
                if (session_id === "new") {
                    return;
                }
                this.session_id = session_id;
            }
        }
    }
    async createSlaves(count, install_token) {
        for (let i = 0; i < count; i++) {
            const wallet = await this.impl.walletManager.createWallet();
            this.master.createAndApplySlave(this.impl.stc, install_token, wallet);
        }
    }
    async distribute() {
        const createDistributeMap = (sols, count) => {
            const n = count;
            const S = sols * web3_js_1.LAMPORTS_PER_SOL;
            const a1 = S / (n * 2);
            const d = (2 * S / (n * (n - 1)) - 2 * a1 / (n - 1));
            return new Array(n).fill(0n).map((_, i) => {
                return BigInt(Math.floor(a1 + d * (i)));
            });
        };
        const motherBalances = await this.impl.walletManager.balance(this.config.motherShip);
        const holdersDistributeSol = this.config.initialBuy.solAmount * this.config.holders.holdAssets.percentFromInfusion / 100;
        const traidersDistributeSol = this.config.initialBuy.solAmount - holdersDistributeSol;
        const have = this.impl.walletManager.nativeCurrencyBalance(motherBalances).amount;
        const need = BigInt((holdersDistributeSol + traidersDistributeSol) * web3_js_1.LAMPORTS_PER_SOL);
        if (have < need) {
            throw new Error("Not enough balance for initial buy");
        }
        const holderDistribMap = createDistributeMap(holdersDistributeSol, this.config.holders.count);
        const traiderDistribMap = createDistributeMap(traidersDistributeSol, this.config.traiders.count);
        const holdersWallets = this.getSlavesHolders().map(s => s.Wallet);
        const traidersWallets = this.getSlavesTraiders().map(s => s.Wallet);
        this.master.distributeNativeCoins(this.config.motherShip, holdersWallets.map((w, i) => ({
            wallet: w,
            amount: holderDistribMap[i]
        })));
        this.master.distributeNativeCoins(this.config.motherShip, traidersWallets.map((w, i) => ({
            wallet: w,
            amount: traiderDistribMap[i]
        })));
    }
    async initialBuy() {
        const __initBuy = async (slaves, balanceRestSol) => {
            const wait_ids = [];
            for (const slave of slaves) {
                const balance = await this.impl.walletManager.balance(slave.Wallet);
                const nativeBalance = this.impl.walletManager.nativeCurrencyBalance(balance).amount;
                logger_1.default.echo(`Slave ${slave.id} balance: ${nativeBalance}lamports\t${Number(nativeBalance) / web3_js_1.LAMPORTS_PER_SOL}sol`);
                const assets = balance.find(b => b.mint == this.config.targetAsset.mint).amount;
                logger_1.default.echo(`Slave ${slave.id} asset balance:`, assets);
                const spent = nativeBalance - BigInt(balanceRestSol) * BigInt(web3_js_1.LAMPORTS_PER_SOL);
                wait_ids.push(slave.pushBuy({
                    asset: this.config.targetAsset,
                    maxSpent: spent,
                    slippagePerc: this.config.slippage.percent,
                    fee: this.config.fee.priority.feeSol,
                }));
            }
            return wait_ids;
        };
        const holders = this.getSlavesHolders();
        const traiders = this.getSlavesTraiders();
        logger_1.default.echo(`Initial buy for ${holders.length} holders and ${traiders.length} traiders`);
        const holders_wait_ids = await __initBuy(holders, this.config.holders.resetAmountSol + this.config.globalBalance.restAmountSol);
        const traiders_wait_ids = await __initBuy(traiders, this.config.traiders.resetAmountSol + this.config.globalBalance.restAmountSol);
        const promises = holders_wait_ids.concat(traiders_wait_ids).map(async (id) => {
            return this.master.waitSlaveOperation(id).then(err => {
                if (err) {
                    logger_1.default.error(`PumpFunTradeService.initialBuy() waitSlaveOperation error: ${err}`);
                    throw new Error(`On operation initialBuy on slave error occured`);
                }
            });
        });
        await Promise.all(promises);
    }
    other_traides_listner_id = -1;
    async createTxLinster() {
        const filterNotBotTrades = (sign) => {
            return !this.master.slavesMetrics().Trades.map(t => t.signature).includes(sign);
        };
        this.other_traides_listner_id = await this.impl.api.subscribeToAssetTrades(this.config.targetAsset.mint, async (event, tx) => {
            event;
            if (!filterNotBotTrades(tx.mint.toString())) {
                return;
            }
        });
    }
    async run() {
        if (this.isRunning()) {
            throw new Error(`PumpFunTradeService.run() called when already running`);
        }
        await this.initConfig(this.userId);
        await this.createSlaves(this.config.traiders.count, slaveTraider_Signature);
        await this.createSlaves(this.config.holders.count, slaveHolder_Signature);
        await this.distribute();
        await this.initialBuy();
        await this.createTxLinster();
        super.run();
    }
    async terminate() {
        if (this.other_traides_listner_id >= 0) {
            this.impl.api.unsubscribeFromAssetTrades(this.config.targetAsset.mint, this.other_traides_listner_id);
        }
        super.terminate();
    }
    getSlavesHolders() {
        return this.master.Slaves.filter(s => s.id.includes(slaveHolder_Signature));
    }
    getSlavesTraiders() {
        return this.master.Slaves.filter(s => !s.id.includes(slaveHolder_Signature));
    }
}
exports.BondCurvPump_Robot = BondCurvPump_Robot;
