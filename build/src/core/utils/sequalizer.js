"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sequalizer = void 0;
const state_1 = require("@core/types/state");
const time_1 = require("./time");
const logger_1 = __importDefault(require("./logger"));
const events_1 = __importDefault(require("events"));
class SequalizerCtx {
    state;
    _metrics;
    constructor(state) {
        this.state = state;
        this.transitionTo(state);
        this._metrics = {
            activeTasks: 0,
            totalTasks: 0,
            awaitingTasks: 0,
            processedTasks: 0,
            errors: 0,
            avgExecTime: 0,
            minExecTime: 0,
            maxExecTime: 0
        };
    }
    transitionTo(state) {
        this.state = state;
        this.state.setContext(this);
    }
    getConcurrency() {
        return this.state.getConcurrency();
    }
    setConcurrency(concurrency) {
        this.state.setConcurrency(concurrency);
    }
    metrics() {
        return this._metrics;
    }
    upateExeTime(execTime) {
        this._metrics.avgExecTime = (this._metrics.avgExecTime * this._metrics.processedTasks + execTime) / (this._metrics.processedTasks + 1);
        this._metrics.minExecTime = Math.min(this._metrics.minExecTime, execTime);
        this._metrics.maxExecTime = Math.max(this._metrics.maxExecTime, execTime);
    }
    updateTaskDone() {
        this._metrics.activeTasks--;
        this._metrics.totalTasks--;
        this._metrics.processedTasks++;
    }
    incrementAwaitingTasks() {
        this._metrics.awaitingTasks++;
    }
    decrementAwaitingTasks(v = 1) {
        this._metrics.awaitingTasks -= v;
    }
    updateError(e) {
        e;
        this._metrics.errors++;
    }
}
class SequalizerState extends state_1.AbstractState {
    latency;
    concurrency;
    constructor() {
        super();
        this.latency = new time_1.HMSTime();
        this.concurrency = 1;
    }
    getConcurrency() {
        return this.concurrency;
    }
    setConcurrency(concurrency) {
        this.concurrency = concurrency;
    }
    getLatency() {
        return this.latency;
    }
    setLatency(latency) {
        this.latency = latency;
    }
}
class Sequalizer {
    active = false;
    executingTasksId = new Array;
    taskQueue = [];
    awaitingTasksId = [];
    ctx;
    emitter;
    id_history = [];
    constructor(concurrency) {
        this.emitter = new events_1.default();
        this.ctx = new SequalizerCtx(new SequalizerState());
        this.ctx.setConcurrency(concurrency || 10);
    }
    isRunning() {
        return this.active;
    }
    genId() {
        return crypto.randomUUID();
    }
    getTasks() {
        return new Array().concat(this.taskQueue);
    }
    async waitAll() {
        while (this.ctx.metrics().activeTasks > 0) {
            await (0, time_1.sleep)(100);
        }
    }
    waitTask(id, timeout = 10000) {
        return new Promise((resolve, reject) => {
            this.emitter.once(`task-${id}-done`, (error) => resolve(error));
            if (timeout) {
                setTimeout(() => reject("Sequalizer::waitTask() timeout"), timeout);
            }
        });
    }
    async waitTasksWithIdMatch(match) {
        const matchs = this.executingTasksId.filter((exeId) => exeId.includes(match));
        return await Promise.all(matchs.map(this.waitTask));
    }
    dropTasks() {
        const droped = this.taskQueue.length;
        this.taskQueue = [];
        for (const waitId of this.awaitingTasksId) {
            this.emitter.removeAllListeners(`__${waitId}`);
            this.ctx.decrementAwaitingTasks(this.ctx.metrics().activeTasks);
        }
        this.ctx.metrics().totalTasks = 0;
        return {
            unDropable: this.ctx.metrics().activeTasks,
            droped: droped
        };
    }
    getMetrics() {
        return Object.assign({}, this.ctx.metrics());
    }
    getConcurrency() {
        return this.ctx.getConcurrency();
    }
    addToHistory(id) {
        if (this.id_history.length >= 1000) {
            this.id_history.splice(0, 100);
        }
        this.id_history.push(id);
    }
    async immidiate({ command }) {
        return await command.execute();
    }
    enqueue(task) {
        if (!this.active) {
            throw new Error("Sequalizer::enqueue() Sequalizer is not running");
        }
        const { after } = task;
        this.ctx.metrics().totalTasks++;
        if (after) {
            if (this.id_history.includes(after)) {
                this.taskQueue.push(task);
            }
            else {
                this.awaitingTasksId.push(after);
                this.ctx.incrementAwaitingTasks();
                this.emitter.once(`__${after}`, (success) => {
                    this.ctx.decrementAwaitingTasks();
                    this.awaitingTasksId.splice(this.awaitingTasksId.indexOf(after), 1);
                    if (success) {
                        this.taskQueue.push(task);
                    }
                    else {
                        console.log("cascade drop: awaiting task failed");
                        this.ctx.metrics().totalTasks--;
                    }
                });
            }
        }
        else {
            this.taskQueue.push(task);
        }
        this.processQueue();
    }
    unenqueue(id) {
        this.taskQueue = this.taskQueue.filter((task) => task.id !== id);
        this.ctx.metrics().totalTasks = this.taskQueue.length;
    }
    filterQueue(fn) {
        const removed = [];
        const kept = [];
        for (const task of this.taskQueue) {
            if (fn(task)) {
                kept.push(task);
            }
            else {
                removed.push(task);
            }
        }
        this.taskQueue = kept;
        return {
            removed: removed,
            kept: kept
        };
    }
    async processQueue() {
        if (this.ctx.metrics().activeTasks >= this.ctx.getConcurrency()
            ||
                this.taskQueue.length === 0) {
            return;
        }
        const task = this.taskQueue.shift();
        this.ctx.metrics().activeTasks++;
        this.executingTasksId.push(task.id);
        let isTaskError = false;
        try {
            if (task.delay) {
                time_1.HMSTime.sleep(task.delay.toJSON());
            }
            const start = Date.now();
            await task.command.execute();
            this.ctx.upateExeTime(Date.now() - start);
        }
        catch (e) {
            isTaskError = true;
            this.ctx.updateError(e);
            logger_1.default.error(`Sequalizer::processQueue() error: ${e}`);
        }
        finally {
            this.addToHistory(String(task.id));
            this.executingTasksId.splice(this.executingTasksId.indexOf(task.id), 1);
            this.emitter.emit(`task-${task.id}-done`, isTaskError);
            this.emitter.emit(`__${task.id}`, !isTaskError);
            setTimeout(() => this.emitter.removeAllListeners(`task-${task.id}-done`));
            this.ctx.updateTaskDone();
            this.processQueue();
        }
    }
    async run() {
        if (this.active) {
            logger_1.default.warn("Sequalizer::run() called when already active");
            return;
        }
        this.active = true;
        return this.processQueue();
    }
    async terminate() {
        if (this.active == false) {
            logger_1.default.warn("Sequalizer::terminate() called when not active");
            return;
        }
        this.active = false;
    }
}
exports.Sequalizer = Sequalizer;
