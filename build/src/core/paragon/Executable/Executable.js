"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Executable = void 0;
const Command_js_1 = require("@paragon/Types/Command.js");
const Input_js_1 = require("@paragon/Types/Input.js");
const time_js_1 = require("@utils/time.js");
class Executable {
    script;
    commandSet;
    checkersSet;
    state;
    cur_action;
    is_on_finally;
    procedure_ep_save;
    constructor(script, commandSet, checkersSet) {
        this.script = script;
        this.commandSet = commandSet;
        this.checkersSet = checkersSet;
        this.state = Object.create({});
        this.state.actions_list = script.actions;
        this.state.cur_action_try = 0;
        this.state.variables = new Map();
        this.state.buffer = "";
        this.is_on_finally = false;
        this.procedure_ep_save = new Array();
        let ep = this.script.actions.find(a => a.entryPoint);
        if (!ep) {
            throw "No entry point in script";
        }
        this.cur_action = ep;
    }
    findCommand(name) {
        const cmd = this.commandSet.find(cmd => cmd.name == name);
        if (!cmd) {
            throw "No such command: " + name;
        }
        return cmd;
    }
    async executeAction(action) {
        const cmd = this.findCommand(action.command);
        let exec = new Command_js_1.CommandExecutor(cmd, action, this.state);
        let ret;
        try {
            ret = await exec.execute();
        }
        catch (e) {
            throw "Fatal command execution error: " + e;
        }
        return ret;
    }
    async chooseNextAction(cmdRet) {
        let next = null;
        if (this.cur_action.conditional) {
            for (const checkObj of this.cur_action.conditional) {
                let checker = this.checkersSet.find(checker => checker.name.toLowerCase() == checkObj.checkFn.toLowerCase());
                if (!checker) {
                    throw "No checkers for action: " + this.cur_action.command;
                }
                if (await checker.fn(cmdRet, await (0, Input_js_1.getInputs)(this.state, checker.inputs, this.cur_action.conditional))) {
                    next = checkObj.next;
                    break;
                }
            }
        }
        else if (this.cur_action.next) {
            if (this.cur_action.next) {
                next = this.cur_action.next;
            }
        }
        return next;
    }
    get currentProcedure() {
        return this.procedure_ep_save[this.procedure_ep_save.length - 1].procedure;
    }
    get isOnProcedure() {
        return this.procedure_ep_save.length > 0;
    }
    async _run() {
        do {
            let cmdRet = await this.executeAction(this.cur_action);
            let next = await this.chooseNextAction(cmdRet);
            if (next) {
                if (typeof next === 'number') {
                    let next_action;
                    if (this.isOnProcedure) {
                        next_action = this.script.procedures[this.currentProcedure].find(cmd => cmd.id == next);
                    }
                    else {
                        next_action = this.script.actions.find(a => a.id === next);
                    }
                    if (!next_action) {
                        throw "Invalid redirection from action id: " + this.cur_action.id + " to action " + next;
                    }
                    this.cur_action = next_action;
                }
                else if (typeof next === 'string') {
                    this.procedure_ep_save.push({
                        procedure: next,
                        back_id: this.cur_action.id
                    });
                    let next_action = this.script.procedures[this.currentProcedure].find(cmd => cmd.entryPoint == true);
                    if (!next_action) {
                        throw "Invalid redirection from action id: " + this.cur_action.id + " to procedure " + next;
                    }
                    this.cur_action = next_action;
                    await this._run();
                }
            }
            else {
                if (this.isOnProcedure && !this.is_on_finally) {
                    let save = this.procedure_ep_save.pop();
                    if (!save) {
                        throw "sdfadsf";
                    }
                    if (this.isOnProcedure) {
                        let next_action = this.script.procedures[this.currentProcedure].find(action => action.id = save.back_id);
                        if (!next_action) {
                            throw "adsf";
                        }
                        this.cur_action = next_action;
                    }
                    else {
                        let next_action = this.script.actions.find(action => action.id = save.back_id);
                        if (!next_action) {
                            throw "adsf";
                        }
                        this.cur_action = next_action;
                    }
                }
                else {
                    if (this.script.finally && !this.is_on_finally) {
                        this.is_on_finally = true;
                        let next_action = this.script.procedures[this.script.finally].find(cmd => cmd.entryPoint == true);
                        if (!next_action) {
                            throw "Invalid redirection from action id: " + this.cur_action.id + " to procedure " + next;
                        }
                        this.cur_action = next_action;
                        await this._run();
                    }
                }
                break;
            }
        } while (true);
    }
    async run() {
        return await Promise.race([
            this._run(),
            (0, time_js_1.timeoutPromise)(this.script.maxExecutionTime)
        ]);
    }
}
exports.Executable = Executable;
