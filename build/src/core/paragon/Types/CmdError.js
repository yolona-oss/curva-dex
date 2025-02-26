"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmdError = void 0;
class CmdError {
    ok;
    returnValue;
    msg;
    constructor(ok = false, returnValue, msg) {
        this.ok = ok;
        this.returnValue = returnValue;
        this.msg = msg;
    }
    Ok() {
        return this.ok;
    }
}
exports.CmdError = CmdError;
