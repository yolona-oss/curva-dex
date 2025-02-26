"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterTraderCtrl = void 0;
const logger_1 = __importDefault(require("@utils/logger"));
const time_1 = require("@utils/time");
const sequalizer_1 = require("@utils/sequalizer");
const trade_1 = require("./types/trade");
const bot_driven_curve_1 = require("./bot-driven-curve");
const array_1 = require("@utils/array");
const constants_1 = require("./constants");
const offer_cmd_1 = require("./offer-cmd");
const built_in_1 = require("./impl/built-in");
class MasterTraderCtrl {
    tradeAsset;
    slaves;
    tradeApi;
    owner;
    walletMngr;
    id;
    _isRunning = false;
    sharedSequalizer;
    botDrivenCurve;
    fullCurve;
    bots_curve_id;
    full_curve_id;
    constructor(tradeAsset, slaves, tradeApi, owner, walletMngr, id = "id_mtc_main") {
        this.tradeAsset = tradeAsset;
        this.slaves = slaves;
        this.tradeApi = tradeApi;
        this.owner = owner;
        this.walletMngr = walletMngr;
        this.id = id;
        this.sharedSequalizer = new sequalizer_1.Sequalizer();
        for (const slave of this.slaves) {
            this.applySlaveToMaster(slave);
        }
        this.bots_curve_id = `${owner}_${this.id}_${this.tradeApi.id}_${this.tradeAsset.symbol}_bots_curve`;
        this.full_curve_id = `${owner}_${this.id}_${this.tradeApi.id}_${this.tradeAsset.symbol}_full_curve`;
        if (tradeAsset.mint !== built_in_1.BLANK_MINT_PREFIX) {
            logger_1.default.echo(`bots_curve_id: ${this.bots_curve_id}`);
            logger_1.default.echo(`full_curve_id: ${this.full_curve_id}`);
            this.botDrivenCurve = bot_driven_curve_1.BotDrivenCurve.loadFromFile(this.owner, this.bots_curve_id);
            this.fullCurve = bot_driven_curve_1.BotDrivenCurve.loadFromFile(this.owner, this.bots_curve_id);
        }
        else {
            this.botDrivenCurve = new bot_driven_curve_1.BotDrivenCurve(this.owner);
            this.fullCurve = new bot_driven_curve_1.BotDrivenCurve(this.owner);
        }
    }
    isRunning() {
        return this._isRunning;
    }
    onSlaveSell(awaited_id, trade) {
        awaited_id;
        this.botDrivenCurve.addTrade({
            sign: trade.signature,
            price: trade.assetPrice,
            quantity: trade.out,
            side: trade_1.TradeSideConst.Sell,
            time: Date.now()
        });
    }
    onSlaveBuy(awaited_id, trade) {
        awaited_id;
        this.botDrivenCurve.addTrade({
            sign: trade.signature,
            price: trade.assetPrice,
            quantity: trade.in,
            side: trade_1.TradeSideConst.Buy,
            time: Date.now()
        });
    }
    async distributeNativeCoins(mother, destinations) {
        const slavesPubKeys = this.slaves.map(s => s.Wallet.publicKey);
        const destsPubKeys = destinations.map(d => d.wallet.publicKey);
        if (!(0, array_1.isUnique)(destsPubKeys)) {
            throw new Error("Destinations must be unique");
        }
        const intersection = (0, array_1.intersect)(slavesPubKeys, destsPubKeys);
        if (intersection.length < destsPubKeys.length) {
            throw new Error("Some destinations are not slaves");
        }
        return await this.walletMngr.distribute(mother, destinations);
    }
    async collectSlavesNativeCoins(to) {
        const slavesWallets = this.slaves.map(s => s.Wallet);
        return await this.walletMngr.collect(slavesWallets, to);
    }
    async getSalveBalanceNative(slave_id) {
        const slave = this.findSlaveByIdOrThrow(slave_id);
        const balances = await this.walletMngr.balance(slave.Wallet);
        return balances.find(b => b.mint === this.walletMngr.nativeCurrency) ?? { amount: 0n, mint: this.walletMngr.nativeCurrency };
    }
    async getSlaveBalanceForAsset(slave_id, mint) {
        const slave = this.findSlaveByIdOrThrow(slave_id);
        const balances = await this.walletMngr.balance(slave.Wallet);
        return balances.find(b => b.mint === mint);
    }
    async pushTradeToQueue(slave_id, side, config) {
        const slave = this.findSlaveByIdOrThrow(slave_id);
        const cmdOpts = config.cmdOpts;
        const offer = cmdOpts.offer;
        if (config.slaveVerification.balance) {
            const err = await offer_cmd_1.OfferVerifier.verifyBalance(slave_id, this, offer, side);
            if (err) {
                return new Error(offer_cmd_1.OfferVerifier.verifyErrorToError(err));
            }
        }
        if (config.slaveVerification.condition) {
            const cond = config.slaveVerification.condition;
            const err = await cond(this, slave);
            if (err) {
                return new Error(offer_cmd_1.OfferVerifier.verifyErrorToError(err));
            }
        }
        const fn = side === trade_1.TradeSideConst.Buy ? slave.pushBuy : slave.pushSell;
        return fn(offer, {
            exe: cmdOpts.exe,
            decline: cmdOpts.decline,
            setup: cmdOpts.setup
        });
    }
    async performTrade(slave_id, side, config, timeout = 60 * 1000) {
        const slave = this.findSlaveByIdOrThrow(slave_id);
        const tradePushRes = await this.pushTradeToQueue(slave_id, side, config);
        if (tradePushRes instanceof Error) {
            return tradePushRes;
        }
        const wait_id = tradePushRes;
        const sideToEvent = side === trade_1.TradeSideConst.Buy ? 'buy' : 'sell';
        const wait_commit_promise = new Promise(response => {
            function verifyWaitId(awaited_id, commit) {
                if (awaited_id === wait_id) {
                    return commit;
                }
                return null;
            }
            const evHandler = (id, commit) => {
                const is_commit = verifyWaitId(id, commit);
                if (is_commit !== null) {
                    slave.off(sideToEvent, evHandler);
                    response(is_commit);
                }
            };
            slave.on(sideToEvent, evHandler);
        });
        return await Promise.race([
            (0, time_1.timeoutPromise)(timeout),
            wait_commit_promise
        ]);
    }
    get Slaves() {
        return this.slaves;
    }
    get WalletManager() {
        return this.walletMngr;
    }
    getSlaveBySign(sign) {
        return this.slaves.find(s => s.id === sign);
    }
    get FullCurve() {
        return this.fullCurve;
    }
    get BotDrivenCurve() {
        return this.botDrivenCurve;
    }
    isPubKeyDuplicant(wallet) {
        return Boolean(this.slaves.find(s => s.Wallet.publicKey == wallet.publicKey));
    }
    throwIfDupsNotAllowed(wallet) {
        if (!constants_1.ALLOW_SLAVE_WALLET_DUPS && this.isPubKeyDuplicant(wallet)) {
            throw new Error("Slave wallet duplicants not allowed");
        }
    }
    createSlaveId(sign) {
        return `master_${this.id}_owner_${this.owner}_${sign}_slave_id`;
    }
    applySlaveToMaster(slave) {
        slave.on('sell', this.onSlaveSell.bind(this));
        slave.on('buy', this.onSlaveBuy.bind(this));
        slave.setSequalizer(this.sharedSequalizer);
    }
    createAndApplySlave(clonable, sign, wallet) {
        this.throwIfDupsNotAllowed(wallet);
        const newId = this.createSlaveId(sign);
        const slave = clonable.clone(newId, this.owner, { wallet }, this.sharedSequalizer);
        this.applySlaveToMaster(slave);
        this.addSlave(slave);
        return slave;
    }
    addSlave(__slave, replaceIdWithSign = "") {
        this.throwIfDupsNotAllowed(__slave.Wallet);
        let slaveReplicant = __slave;
        if (replaceIdWithSign != "") {
            slaveReplicant = __slave.clone(this.createSlaveId(replaceIdWithSign), this.owner, { wallet: __slave.Wallet }, this.sharedSequalizer);
        }
        this.applySlaveToMaster(slaveReplicant);
        this.slaves.push(slaveReplicant);
        return this;
    }
    async filterSlaves(fn) {
        let removed = [];
        let kept = [];
        for (const slave of this.slaves) {
            if (await fn(slave)) {
                kept.push(slave);
            }
            else {
                removed.push(slave);
            }
        }
        for (const toRemove of removed) {
            await this.removeSlave(toRemove.Wallet);
        }
        return {
            removedCount: removed.length,
            kept: kept
        };
    }
    async removeSlave(wallet) {
        const slaveToRemove = this.slaves.find(s => s.Wallet.publicKey === wallet.publicKey && s.Wallet.secretKey === wallet.secretKey);
        if (slaveToRemove) {
            const searchId = slaveToRemove.id;
            await slaveToRemove.shutdown();
            this.slaves = this.slaves.filter(s => s.id !== searchId);
            logger_1.default.echo(`MasterTraderCtrl::removeSlave() removed slave ${searchId}`);
        }
        else {
            logger_1.default.error(`MasterTraderCtrl::removeSlave() slave with pubKey: "${wallet.publicKey}" not found`);
        }
    }
    findSlaveById(id) {
        return this.slaves.find(s => s.id === id);
    }
    findSlaveByIdOrThrow(id) {
        const slave = this.slaves.find(s => s.id === id);
        if (!slave) {
            throw new Error(`MasterTraderCtrl::findSlaveByIdOrThrow() slave with id: "${id}" not found`);
        }
        return slave;
    }
    findSlaveByWallet(wallet) {
        return this.slaves.find(s => s.Wallet.publicKey === wallet.publicKey && s.Wallet.secretKey === wallet.secretKey);
    }
    async applyToSlaves(fn) {
        for (let i = 0; i < this.slaves.length; i++) {
            await fn(this.slaves[i], i);
        }
    }
    async assetInfo() {
        return await this.tradeApi.assetInfo(this.tradeAsset);
    }
    slavesCount() {
        return this.slaves.length;
    }
    async run() {
        this._isRunning = true;
        this.sharedSequalizer.run();
        const interval = 100;
        while (this._isRunning) {
            const start = performance.now();
            (0, time_1.sleep)(interval);
            const end = performance.now();
            const delta = end - start;
            if (delta < interval) {
                await (0, time_1.sleep)(interval - delta);
            }
        }
    }
    async terminate() {
        console.log("MTC DONE");
        this._isRunning = false;
        this.botDrivenCurve.saveToFile(this.bots_curve_id);
        this.fullCurve.saveToFile(this.full_curve_id);
        await this.sharedSequalizer.waitAll();
        await this.sharedSequalizer.terminate();
        for (const slave of this.slaves) {
            await slave.shutdown();
        }
    }
    async waitSlaveOperation(opId) {
        return await this.sharedSequalizer.waitTask(opId);
    }
    slavesMetrics() {
        return this.agregateMetrics(this.slaves.map(s => s.metrics()));
    }
    agregateMetrics(slaveMetrics, initial = {
        Trades: [],
        SuccessTrades: [],
        SellTrades: [],
        BuyTrades: [],
        ErrorTrades: [],
        ErrorRate: 0,
        BuyMeanPrice: 0n,
        SellMeanPrice: 0n,
        AssetTradeVolume: 0n,
        PrimCurrencyTradeVolume: 0n,
        SpentOnAsset: 0n,
        GainOnAsset: 0n,
        SpentOnFee: 0n,
        DropedTradesCount: 0
    }) {
        let dmetrics = Object.assign({}, initial);
        const concatMetrics = (src, dst) => {
            dst.Trades = dst.Trades.concat(src.Trades);
            dst.SuccessTrades = dst.SuccessTrades.concat(src.SuccessTrades);
            dst.SellTrades = dst.SellTrades.concat(src.SellTrades);
            dst.BuyTrades = dst.BuyTrades.concat(src.BuyTrades);
            dst.ErrorTrades = dst.ErrorTrades.concat(src.ErrorTrades);
            dst.ErrorRate = dst.ErrorRate + src.ErrorRate;
            dst.BuyMeanPrice = dst.BuyMeanPrice + src.BuyMeanPrice;
            dst.SellMeanPrice = dst.SellMeanPrice + src.SellMeanPrice;
            dst.AssetTradeVolume = dst.AssetTradeVolume + src.AssetTradeVolume;
            dst.PrimCurrencyTradeVolume = dst.PrimCurrencyTradeVolume + src.PrimCurrencyTradeVolume;
            dst.SpentOnAsset = dst.SpentOnAsset + src.SpentOnAsset;
            dst.GainOnAsset = dst.GainOnAsset + src.GainOnAsset;
            dst.SpentOnFee = dst.SpentOnFee + src.SpentOnFee;
            dst.DropedTradesCount = dst.DropedTradesCount + src.DropedTradesCount;
        };
        slaveMetrics.forEach((smetric) => {
            concatMetrics(smetric, dmetrics);
        });
        return dmetrics;
    }
}
exports.MasterTraderCtrl = MasterTraderCtrl;
