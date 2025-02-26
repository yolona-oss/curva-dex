"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const lock_manager_1 = require("@utils/lock-manager");
const config_1 = require("@core/config");
const mongoose_1 = require("@core/db/mongoose");
const with_init_1 = require("@core/types/with-init");
const logger_1 = __importDefault(require("@utils/logger"));
const find_process_1 = __importDefault(require("find-process"));
const mongoose_2 = __importDefault(require("mongoose"));
const dotenv_1 = require("dotenv");
const time_1 = require("@utils/time");
(0, dotenv_1.configDotenv)({
    path: '.env'
});
class Application extends with_init_1.WithInit {
    _isRunning = false;
    id;
    ui;
    lockManager = new lock_manager_1.LockManager(`./.lock`);
    constructor(name, ui) {
        super();
        this.ui = ui;
        this.id = name;
        process.on("SIGINT", async () => {
            logger_1.default.echo("SIGINT received. Terminating...");
            await this.terminate();
        });
        process.on("SIGTERM", async () => {
            logger_1.default.echo("SIGINT received. Terminating...");
            await this.terminate();
        });
    }
    isRunning() {
        return this._isRunning;
    }
    async Initialize() {
        try {
            await (0, config_1.createConfigIfNotExists)();
            logger_1.default.echo("Application::setup() checking lock...");
            await this.lockApp();
            const plzkillme = await (0, config_1.getConfig)();
            await (0, mongoose_1.MongoConnect)(plzkillme.server.database.mongoose.connectionUri, plzkillme.server.database.mongoose.connectionOptions);
        }
        catch (e) {
            logger_1.default.error("App preinitialization failed:", e);
            process.exit(-1);
        }
    }
    _prevErrorHandler;
    setErrorInterceptor(handler) {
        if (this._prevErrorHandler) {
            process.removeListener("uncaughtException", this._prevErrorHandler);
            process.removeListener("rejectionHandled", this._prevErrorHandler);
        }
        this._prevErrorHandler = handler;
        process.on("uncaughtException", handler);
        process.on("rejectionHandled", handler);
    }
    removeLock(hash) {
        this.lockManager.deleteLockFile(lock_manager_1.LockManager.createLockFileName(hash));
    }
    async run() {
        if (!this.isInitialized()) {
            logger_1.default.error("Application. Incoreect implementations of Initialize(). Not setInitialized() called.");
            process.exit(-1);
        }
        if (this._isRunning) {
            throw new Error("Application::run() called when already active");
        }
        try {
            logger_1.default.echo("Application::run() ui running...");
            await this.ui.run();
            logger_1.default.echo("Application::run() processing...");
        }
        catch (e) {
            logger_1.default.error("Application::run() failed ui start:", e);
            logger_1.default.error("Forse terminating.");
            await this.terminate();
        }
        this._isRunning = true;
        while (this.isRunning()) {
            await (0, time_1.sleep)(1000);
        }
    }
    async terminate() {
        if (this.ui.isRunning()) {
            await this.ui.terminate();
        }
        else {
            logger_1.default.echo("Application::terminate() UI not running");
        }
        logger_1.default.echo("Application::terminate() cleanup lock files...");
        this.lockManager.cleanupAll();
        await mongoose_2.default.disconnect();
        this._isRunning = false;
        process.exit(0);
    }
    async isPreviousRunning() {
        const pid = this.lockManager.getLockFileData(this.id);
        if (typeof pid !== "string") {
            return false;
        }
        return (await (0, find_process_1.default)("pid", pid)).length > 0;
    }
    async lockApp() {
        const createLock = () => {
            this.lockManager.deleteLockFile(lock_manager_1.LockManager.createLockFileName(this.id));
            this.lockManager.createLockFile(this.id, process.pid.toString());
        };
        const lock = this.lockManager.createLockFile(this.id, process.pid.toString());
        if (!lock) {
            if (await this.isPreviousRunning()) {
                throw new Error("Application.lockApp() application with spame id already running");
            }
        }
        createLock();
    }
}
exports.Application = Application;
