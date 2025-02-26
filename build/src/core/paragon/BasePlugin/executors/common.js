"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetVariable = SetVariable;
exports.RemoveVariable = RemoveVariable;
exports.ExistsVariable = ExistsVariable;
exports.Dummy = Dummy;
const CmdError_1 = require("@paragon/Types/CmdError");
async function SetVariable(...inputs) {
    const var_name = inputs[0];
    const var_value = inputs[1];
    this.variables.set(var_name, var_value);
    return new CmdError_1.CmdError(true, var_value);
}
async function RemoveVariable(...inputs) {
    const var_name = inputs[0];
    if (this.variables.has(var_name)) {
        this.variables.delete(var_name);
    }
    return new CmdError_1.CmdError(true);
}
async function ExistsVariable(...inputs) {
    const var_name = inputs[0];
    if (!this.variables.has(var_name)) {
        return new CmdError_1.CmdError(false, "Not exists", "Variable \"" + var_name + "\" not exists");
    }
    return new CmdError_1.CmdError(true, true);
}
async function Dummy(..._) {
    return new CmdError_1.CmdError(true, true);
}
