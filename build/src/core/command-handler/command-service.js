"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommandService = void 0;
const db_1 = require("@core/db");
const EventEmitter_1 = require("@utils/EventEmitter");
const object_1 = require("@utils/object");
class BaseCommandService extends EventEmitter_1.EventEmitter {
    userId;
    config;
    name;
    isActive = false;
    session_id;
    constructor(userId, config, name = "common-cmd-hub-service") {
        super();
        this.userId = userId;
        this.config = config;
        this.name = name;
        this.session_id = this.createServicePrefix() + "_" + userId + "_" + new Date().toLocaleString('ru').replace(/:/g, "-");
    }
    createServicePrefix() {
        return `${this.name}-${this.userId}`;
    }
    configEntries() {
        return (0, object_1.getInterfacePathsWithTypes)(this.config);
    }
    async initConfig(userId) {
        const user = (await db_1.Manager.findOne({ userId }));
        const account = (await db_1.Account.findById(user.account));
        const accountConfig = await account.getModuleData(this.name, "");
        if (accountConfig && !(0, object_1.isEmpty)(accountConfig)) {
            this.config = accountConfig;
        }
        else {
            await account.setModuleData(this.name, "", this.config);
        }
    }
    async setConfigValue(forUserId, path, value) {
        const user = (await db_1.Manager.findOne({ userId: forUserId }));
        const account = (await db_1.Account.findById(user.account));
        account.setModuleData(this.name, path, value);
        this.config = (0, object_1.assignToCustomPath)(this.config, path, value);
    }
    isRunning() {
        return this.isActive;
    }
    async run() {
        this.isActive = true;
    }
    async terminate() {
        this.isActive = false;
        this.emit("done");
    }
}
exports.BaseCommandService = BaseCommandService;
