import { BuiltInUICmdArray } from "../built-in-cmd";
import { BaseCommandService } from "../command-service";
import { BuiltInCmdNames } from "../constants";
import { ICmdCallback, ICommandDescriptor, ICommandDescriptorArg, ReadingCtxType } from "../types";
import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext } from "./abstract-handler";

export class HandleCmdBuilder<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {
    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE CMD BUILDER")

        const { command, userId, uiCtx, args, currentCmdHandler } = request

        const builder = currentCmdHandler.CommandBuilder

        // resume builder
        if (builder.isUserOnBuild(userId)) {
            const res = builder.handle(userId, command)

            return {
                success: !Boolean(res.error),
                text: res.markup.text,
                markup: res.markup.options
            }
        }

        let isNeedToStartBuilder
        try {
            isNeedToStartBuilder = !currentCmdHandler.isCommandHaveAllArgs(command, args)
        } catch (e) {
            isNeedToStartBuilder = false
        }
        if (isNeedToStartBuilder) {
            let cb
            let isBuiltIn = true
            let isService = false
            let isActive = false

            if (currentCmdHandler.isBuiltInCommand(command)) {
                cb = BuiltInCmdNames.find(builtInCmd => builtInCmd === command)
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
                const args_args: ICommandDescriptorArg[] = (cb as ICmdCallback<Ctx>).args?.map(a => ({
                    ctx: 'args',
                    name: a
                })) ?? []

                desc = {
                    args: args_args
                }
            } else if (isBuiltIn) {
                desc = {
                    args: (BuiltInUICmdArray.find(c => c.command === command)?.args ?? []).map(a => ({
                        ctx: 'args',
                        name: a
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
