import { script, scriptAction } from '@paragon/Types/script.js'
import { Command, CommandExecutor } from '@paragon/Types/Command.js'
import { BaseState } from '@paragon/Types/State.js'
import { CheckFn, CheckObj } from '@paragon/Types/Conditional.js'
import { CmdError } from '@paragon/Types/CmdError.js'
import { getInputs } from '@paragon/Types/Input.js'

import { timeoutPromise } from '@utils/time.js'

export class Executable<S extends BaseState> {
    protected state: S
    protected cur_action: scriptAction
    protected is_on_finally: boolean
    protected procedure_ep_save: Array<{
        procedure: string
        back_id: number
    }>

    constructor(
        private script: script,
        private commandSet: Command<S>[],
        private checkersSet: CheckObj[],
    ) {
        this.state = Object.create({})
        this.state.actions_list = script.actions
        this.state.cur_action_try = 0
        this.state.variables = new Map()
        this.state.buffer = ""

        this.is_on_finally = false
        this.procedure_ep_save = new Array()

        let ep = this.script.actions.find(a => a.entryPoint)
        if (!ep) {
            throw "No entry point in script"
        }
        this.cur_action = ep

        // validate all commands specified in actions
    }

    private findCommand(name: string) {
        const cmd = this.commandSet.find(cmd => cmd.name == name)
        // this check must do a validator on startup
        if (!cmd) {
            throw "No such command: " + name
        }
        return cmd
    }

    // execution action
    private async executeAction(action: scriptAction): Promise<CmdError> {
        const cmd = this.findCommand(action.command)
        let exec = new CommandExecutor<S>(cmd, action, this.state)
        let ret
        try {
            ret = await exec.execute()
        } catch (e) {
            throw "Fatal command execution error: " + e
        }
        return ret
    }

    private async chooseNextAction(cmdRet: CmdError): Promise<string | number | null> {
        let next = null

        if (this.cur_action.conditional) {
            for (const checkObj of this.cur_action.conditional) {
                let checker = this.checkersSet.find(checker =>
                    checker.name.toLowerCase() == checkObj.checkFn.toLowerCase()
                )
                if (!checker) {
                    throw "No checkers for action: " + this.cur_action.command
                }
                // TODO make as the CommandExecutor
                if (await checker.fn(cmdRet, await getInputs(this.state, checker.inputs, this.cur_action.conditional))) {
                    next = checkObj.next
                    break
                }
            }
        } else if (this.cur_action.next) {
            if (this.cur_action.next) {
                next = this.cur_action.next
            }               
        }

        return next
    }

    private get currentProcedure() {
        // TODO assertion
        return this.procedure_ep_save[this.procedure_ep_save.length-1].procedure
    }

    private get isOnProcedure() {
        return this.procedure_ep_save.length > 0
    }

    // used for both of execution common comand query, procedures and finally action of passed script
    // TODO maybe use recursion with this.cur_action as argument?
    private async _run(): Promise<void> {
        do {
            let cmdRet = await this.executeAction(this.cur_action)
            let next = await this.chooseNextAction(cmdRet)

            if (next) {
                if (typeof next === 'number') { // to indexed action/procedure
                    let next_action
                    if (this.isOnProcedure) {
                        next_action = this.script.procedures[this.currentProcedure].find(cmd => cmd.id == next)
                    } else {
                        next_action = this.script.actions.find(a => a.id === next)
                    }
                    if (!next_action) {
                        throw "Invalid redirection from action id: " + this.cur_action.id + " to action " +  next
                    }
                    this.cur_action = next_action
                } else if (typeof next === 'string') {// to named procedure
                    this.procedure_ep_save.push({
                        procedure: next,
                        back_id: this.cur_action.id
                    })
                    let next_action = this.script.procedures[this.currentProcedure].find(cmd => cmd.entryPoint == true)
                    if (!next_action) {
                        throw "Invalid redirection from action id: " + this.cur_action.id + " to procedure " +  next
                    }
                    this.cur_action = next_action
                    await this._run()
                }
            } else {
                if (this.isOnProcedure && !this.is_on_finally) { // is on non finalization step procedure
                    let save = this.procedure_ep_save.pop()
                    if (!save) {
                        // TODO
                        throw "sdfadsf"
                    }
                    // back to previus procedure
                    if (this.isOnProcedure) {
                        let next_action = this.script.procedures[this.currentProcedure].find(action => action.id = save!.back_id)
                        if (!next_action) {
                            // TODO
                            throw "adsf"
                        }
                        this.cur_action = next_action
                    } else { // back to normal execution
                        let next_action = this.script.actions.find(action => action.id = save!.back_id)
                        if (!next_action) {
                            // TODO
                            throw "adsf"
                        }
                        this.cur_action = next_action
                    }
                } else {
                    if (this.script.finally && !this.is_on_finally) { // is on finalization step
                        this.is_on_finally = true
                        let next_action = this.script.procedures[this.script.finally].find(cmd => cmd.entryPoint == true)
                        if (!next_action) {
                            throw "Invalid redirection from action id: " + this.cur_action.id + " to procedure " +  next
                        }
                        this.cur_action = next_action
                        await this._run()
                    }
                }
                break
            }
        } while (true)
    }

    async run(): Promise<void> {
        return await Promise.race([
            this._run(),
            timeoutPromise(this.script.maxExecutionTime)
        ])
    }
}
