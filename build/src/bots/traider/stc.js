"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaveTraderCtrl = void 0;
const time_1 = require("@utils/time");
const cloner_1 = require("@utils/cloner");
const logger_1 = __importDefault(require("@utils/logger"));
const trade_1 = require("./types/trade");
const stc_metric_1 = require("./stc-metric");
const offer_cmd_1 = require("./offer-cmd");
const wallet_manager_1 = require("./wallet-manager");
const fs_1 = require("@utils/fs");
const built_in_1 = require("./impl/built-in");
const events_1 = require("events");
const session_id_g = new Date().toLocaleString('ru').replace(/:/g, "-").replace(', ', '_');
class SlaveTraderCtrl extends events_1.EventEmitter {
    id;
    owner;
    static slaveOrdinaryNumber = 0;
    tradeApi;
    sequalizer;
    _metrics;
    traider;
    on_cmd_failed = () => { };
    constructor(id, owner, tradeApi, wallet, sharedSequalizer) {
        super();
        this.id = id;
        this.owner = owner;
        this.tradeApi = tradeApi.clone();
        this.sequalizer = sharedSequalizer;
        this._metrics = new stc_metric_1.STCMetrics();
        this.traider = {
            wallet: Object.assign({}, wallet)
        };
        if (SlaveTraderCtrl.slaveOrdinaryNumber >= Number.MAX_VALUE - 1) {
            logger_1.default.warn(`SlaveTraderCtrl.slaveOrdinaryNumber overflowed. Resetting to 0`);
            SlaveTraderCtrl.slaveOrdinaryNumber = 0;
        }
        if (!wallet_manager_1.BaseWalletManager.cmpWallets(this.traider.wallet, built_in_1.BLANK_WALLET_OBJ)) {
            this.saveUsedWallet();
        }
    }
    saveUsedWallet() {
        if (wallet_manager_1.BaseWalletManager.cmpWallets(this.traider.wallet, built_in_1.BLANK_WALLET_OBJ))
            return;
        (0, fs_1.writeJsonData)([this.owner, "slave-wallets", `owner-${this.owner}-session-` + session_id_g], this.id, this.traider.wallet);
    }
    saveMetrics() {
        if (wallet_manager_1.BaseWalletManager.cmpWallets(this.traider.wallet, built_in_1.BLANK_WALLET_OBJ))
            return;
        (0, fs_1.writeJsonData)([this.owner, "slave-metrics", `owner-${this.owner}-session-` + session_id_g], this.id, this.metrics());
    }
    setSequalizer(sequalizer) {
        this.sequalizer = sequalizer;
    }
    get Wallet() {
        return new cloner_1.Cloner(this.traider.wallet).clone();
    }
    async canPerformOffer(offer, side, walletmngr) {
        const balance = await walletmngr.balance(this.traider.wallet);
        let avalibleBalance = walletmngr.nativeCurrencyBalance(balance).amount;
        if (side === trade_1.TradeSideConst.Sell) {
            let asset = balance.find(b => b.mint === offer.asset.mint);
            if (!asset) {
                return {
                    success: false,
                    spent: 0n,
                    error: {
                        msg: `No asset: ${offer.asset.mint}`,
                        err: "asset"
                    },
                    rest: 0n
                };
            }
            const assetPrice = (await this.tradeApi.assetInfo(offer.asset)).price;
            if (asset.amount < offer.maxSpent / assetPrice) {
                return {
                    success: false,
                    spent: 0n,
                    error: {
                        msg: `Not enough asset: ${offer.asset.mint}`,
                        err: "balance"
                    },
                    rest: 0n
                };
            }
        }
        else if (side === trade_1.TradeSideConst.Buy) {
            if (avalibleBalance < offer.maxSpent) {
                return {
                    success: false,
                    spent: 0n,
                    error: {
                        msg: `Not enough balance`,
                        err: "balance"
                    },
                    rest: 0n
                };
            }
        }
        else {
            throw new Error(`SlaveTraderCtrl::canPerformOffer() Unknown side: ${side}`);
        }
        return {
            success: true,
            spent: offer.maxSpent,
            rest: avalibleBalance - offer.maxSpent,
        };
    }
    metrics() {
        return this._metrics.agregate();
    }
    pushSell(offer, opt = {}, afterId) {
        return this.pushOffer({
            offer: {
                ...offer,
                traider: this.traider
            },
            setup: opt.setup ?? {},
            decline: opt.decline ?? {},
            exe: opt.exe ?? {}
        }, trade_1.TradeSideConst.Sell, afterId);
    }
    pushBuy(offer, opt = {}, afterId) {
        return this.pushOffer({
            offer: {
                ...offer,
                traider: this.traider
            },
            setup: opt.setup ?? {},
            decline: opt.decline ?? {},
            exe: opt.exe ?? {}
        }, trade_1.TradeSideConst.Buy, afterId);
    }
    pushOffer(opt, side, afterId) {
        if (!this.sequalizer) {
            throw new Error(`SlaveTraderCtrl::pushOffer() Sequalizer not set`);
        }
        const delay = opt.setup.delay;
        const wait_id = `${this.id}-${SlaveTraderCtrl.slaveOrdinaryNumber}-${side}-${opt.offer.asset.mint}-${this.sequalizer.genId()}`;
        const cmd = new offer_cmd_1.OfferCmd({
            id: wait_id,
            cmd_opt: opt,
            side,
            api: this.tradeApi,
        });
        cmd.on("Done", (id, exec_time, success, commit) => this._handleCmdDone.bind(this)(id, exec_time, success, commit));
        cmd.on('DropOne', this._handleCmdDrop.bind(this));
        cmd.on('DropAll', this._handleCmdDropAll.bind(this));
        this.sequalizer.enqueue({
            id: wait_id,
            delay: delay ? new time_1.HMSTime({ milliseconds: delay }) : undefined,
            command: cmd,
            after: afterId
        });
        return wait_id;
    }
    async shutdown() {
        if (wallet_manager_1.BaseWalletManager.cmpWallets(this.traider.wallet, built_in_1.BLANK_WALLET_OBJ)) {
            return;
        }
        if (this.sequalizer && this.sequalizer.isRunning()) {
            logger_1.default.echo(`SlaveTraderCtrl::shutdown() removing queue for ${this.id}`);
            const { removed, kept } = this.sequalizer.filterQueue(t => t.id.includes(this.id));
            logger_1.default.echo(`SlaveTraderCtrl::shutdown() removed ${removed.length} tasks for ${this.id}`);
            logger_1.default.echo(`SlaveTraderCtrl::shutdown() kept ${kept.length} tasks for ${this.id}`);
            const success = await this.sequalizer.waitTasksWithIdMatch(this.id);
            logger_1.default.echo(`SlaveTraderCtrl::shutdown() awaited all tasks for ${this.id}. Await success: ${success}`);
        }
        logger_1.default.echo(`SlaveTraderCtrl::shutdown() saving metrics with trades count: ${this._metrics.Trades.length} for ${this.id}`);
        this.saveMetrics();
    }
    _handleCmdDone(awaited_id, exec_time, success, commit) {
        console.log(`"${awaited_id}" done. success: ${success}`);
        if (!success || !commit) {
        }
        else if (commit && success) {
            this._metrics.addTrade({ ...commit, exec_time });
            if (commit.side === trade_1.TradeSideConst.Sell) {
                this.emit("sell", awaited_id, commit);
            }
            else {
                this.emit("onbuy", awaited_id, commit);
            }
        }
    }
    _handleCmdDrop(id) {
        console.log(`"${id}" dropped.`);
        this._metrics.increaseDroped();
    }
    _handleCmdDropAll(id) {
        console.log(`after "${id}" all dropped.`);
        const { droped, unDropable } = this.sequalizer.dropTasks();
        console.log(`"${unDropable}" already in execution pipeline. ${droped} dropped.`);
        this._metrics.increaseDroped(droped);
    }
}
exports.SlaveTraderCtrl = SlaveTraderCtrl;
