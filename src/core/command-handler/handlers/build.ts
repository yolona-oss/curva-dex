import { parseOptions } from "@core/ui/types/command";
import { BuiltInUICmdArray } from "../built-in-cmd";
import { BaseCommandService } from "../command-service";
import { ICmdCallback, ICommandDescriptor, ICommandDescriptorArg, ReadingCtxType } from "../types";
import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext } from "./abstract-handler";
import { IManager } from "@core/db";

// TODO add completion for builtin commands

export class HandleCmdBuilder<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {
    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE CMD BUILDER")

        const { command, userId, uiCtx, args, currentCmdHandler } = request

        const builder = currentCmdHandler.CommandBuilder

        // resume builder
        if (builder.isUserOnBuild(userId)) {
            console.log(" -- RESUME BUILDER --")
            const res = builder.handle(userId, command)

            return {
                success: !Boolean(res.error),
                text: res.markup.text,
                markup: res.markup.options
            }
        }

        let isNeedToStartBuilder
        try {
            isNeedToStartBuilder = !currentCmdHandler.isAllArgsPassed(command, args)
            console.log(isNeedToStartBuilder)
        } catch (e) {
            isNeedToStartBuilder = false
        }
        if (isNeedToStartBuilder) {
            console.log(" -- START BUILDER --")
            let cb
            let isBuiltIn = true
            let isService = false
            let isActive = false

            if (currentCmdHandler.isBuiltInCommand(command)) {
                cb = BuiltInUICmdArray.find(builtInCmd => builtInCmd.command === command)
                //return await super.handle(request)
            } else {
                cb = currentCmdHandler.getCallbackFromCommandName(command)

                if (!cb) {
                    return {
                        success: false,
                        text: `Unknown command "${command}"`
                    }
                }

                isService = cb.fn instanceof BaseCommandService
                isActive = isService ? currentCmdHandler.isServiceActive(userId, cb.fn.name) : false
                isBuiltIn = false
            }

            const ctxs: ReadingCtxType[] =
                isService ?
                    isActive ?
                        ['message'] :
                        ['params', 'config'] :
                    ['args']

            let desc: ICommandDescriptor = { args: [] }

            if (isService && !isBuiltIn) {
                const service = (cb as ICmdCallback<Ctx>).fn as BaseCommandService

                const cfg_args: ICommandDescriptorArg[] = service.configEntries().map(c => ({
                    ctx: 'config',
                    name: c.path
                }))
                const params_args: ICommandDescriptorArg[] = service.paramsEntries().map(c => ({
                    ctx: 'params',
                    name: c.path
                }))
                const msg_args: ICommandDescriptorArg[] = service.receiveMsgEntries().map(c => ({
                    ctx: 'message',
                    name: c.path
                }))

                desc.args = isActive ? msg_args : params_args.concat(cfg_args)
            } else if (!isService && !isBuiltIn) {
                const commonCbArgs: ICommandDescriptorArg[] = (cb as ICmdCallback<Ctx>).args?.map(a => ({
                    ctx: 'args',
                    name: a.name,
                    description: a.description,
                    options: a.options ? parseOptions(a.options, currentCmdHandler, uiCtx.manager as IManager) : undefined,
                    validator: a.validator
                })) ?? []

                desc = {
                    args: commonCbArgs
                }
            } else if (isBuiltIn) {
                desc = {
                    args: (BuiltInUICmdArray.find(c => c.command === command)?.args ?? []).map(a => ({
                        ctx: 'args',
                        name: a.name,
                        description: a.description,
                        options: a.options ? parseOptions(a.options, currentCmdHandler, uiCtx.manager as IManager) : undefined,
                        validator: a.validator
                    }))
                }
            }

            const res = builder.startBuild(userId, command, desc, ctxs)

            return {
                success: true,
                text: res.text,
                markup: res.options
            }
        }

        return await super.handle(request)
    }
}
