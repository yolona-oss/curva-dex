"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const traider_1 = require("@bots/traider");
(() => {
    const args = process.argv.slice(2);
    const owner = args[0];
    const curve_id = args[1];
    const curve = traider_1.BotDrivenCurve.loadFromFile(owner, curve_id);
    console.log(curve.consolePrintVertical());
})();
