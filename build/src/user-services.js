"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceOne = void 0;
const command_handler_1 = require("@core/command-handler");
const random_1 = require("@utils/random");
const time_1 = require("@utils/time");
class ServiceOne extends command_handler_1.BaseCommandService {
    max = 1000;
    constructor(userId, name = 'blob') {
        super(userId, {}, name);
    }
    loadInitParams(...args) {
        const max = Number(args[0]);
        if (max && max > 0) {
            this.max = max;
        }
    }
    clone(userId, newName) {
        return new ServiceOne(userId, newName);
    }
    async run() {
        await super.run();
        let i = 3;
        while (true) {
            if (!super.isRunning()) {
                break;
            }
            this.emit("message", "blob" + i);
            i = i + (0, random_1.genRandomNumberBetweenWithScatter)(-199, 320, 30, 2);
            await (0, time_1.sleep)(1000);
            if (i > this.max) {
                await this.terminate();
            }
        }
    }
}
exports.ServiceOne = ServiceOne;
