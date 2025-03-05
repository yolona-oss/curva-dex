import { exposeCmdArgumentDefOptions } from "@core/ui/types/command";
import { BuiltInUICmdArray } from "../built-in-cmd";
import { BaseCommandService } from "../command-service";
import { ICmdCallback, ICmdService, ICommandDescriptor, ICommandDescriptorArg, ReadingCtxType } from "../types";
import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext } from "./abstract-handler";
import { IManager } from "@core/db";
import { CommandBuilder } from "../command-builder";
import { MotherCmdHandler } from "../mother-cmd-handler";

// TODO add completion for builtin commands

type ICmdCallbackOrBuiltIn<UICtx extends BaseUIContext> = ICmdCallback<UICtx> | Omit<ICmdCallback<UICtx>, 'fn'>

export class HandleCmdBuilder<UICtx extends BaseUIContext> extends AbstractCmdHandler<UICtx> {

    private getCbConfig(cb: ICmdCallbackOrBuiltIn<UICtx>, handler: MotherCmdHandler<UICtx>, userId: string) {
        let isService = false
        let isActive = false
        if ('fn' in cb) {
            isService = cb.fn instanceof BaseCommandService
            isActive = isService ? handler.isServiceActive(userId, cb.fn.name) : false
        }

        return {
            isService,
            isActive,
            isBuiltIn: !('fn' in cb)
        }
    }

    private selectCtxs(cb: ICmdCallbackOrBuiltIn<UICtx>, userId: string, handler: MotherCmdHandler<UICtx>): ReadingCtxType[] {
        const { isService, isActive } = this.getCbConfig(cb, handler, userId)

        return isService ?
            isActive ?
                ['message'] :
                ['params', 'config'] :
            ['args']
    }

    private configureServiceDesc(service: ICmdService, isActive: boolean): ICommandDescriptor {
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

        console.log(cfg_args)
        console.log(params_args)
        console.log(msg_args)

        return {
            args: isActive ? msg_args : params_args.concat(cfg_args)
        }
    }

    private configureFunctionDesc(cb: ICmdCallback<UICtx>, cmdHandler: MotherCmdHandler<UICtx>, ctx: UICtx): ICommandDescriptor {
        const commonCbArgs: ICommandDescriptorArg[] = cb.args?.map(a => ({
            ctx: 'args',
            name: a.name,
            description: a.description,
            options: a.options ? exposeCmdArgumentDefOptions(a.options, cmdHandler, ctx.manager as IManager) : undefined,
            validator: a.validator
        })) ?? []

        return {
            args: commonCbArgs
        }
    }

    private configureBuiltInDesc(command: string, cmdHandler: MotherCmdHandler<UICtx>, ctx: UICtx): ICommandDescriptor {
        return {
            args: (BuiltInUICmdArray.find(c => c.command === command)?.args ?? []).map(a => ({
                ctx: 'args',
                name: a.name,
                description: a.description,
                options: a.options ? exposeCmdArgumentDefOptions(a.options, cmdHandler, ctx.manager as IManager) : undefined,
                validator: a.validator
            }))
        }
    }

    // TODO set configreAs types in other place and disperce to all code base
    private configureDescriptors(configureAs: "function" | "service" | "built-in", cb: ICmdCallbackOrBuiltIn<UICtx>, command: string, cmdHandler: MotherCmdHandler<UICtx>, ctx: UICtx): ICommandDescriptor {
        switch (configureAs) {
            case "function":
                return this.configureFunctionDesc(cb as ICmdCallback<UICtx>, cmdHandler, ctx)
            case "service":
                if (!('fn' in cb)) {
                    throw new Error(`configureAs: "service" but no fn in callback`)
                }
                const { isActive } = this.getCbConfig(cb, cmdHandler, String(ctx.manager!.userId))
                return this.configureServiceDesc(cb.fn as ICmdService, isActive)
            case "built-in":
                return this.configureBuiltInDesc(command, cmdHandler, ctx)
        }
    }

    private async startNewBuild(userId: string, command: string, args: string[], ctx: UICtx, builder: CommandBuilder, cmdHandler: MotherCmdHandler<UICtx>): Promise<ICmdHandlerResponce|void> {
        if (!cmdHandler.isAllArgsPassed(command, args)) {
            let cb

            if (cmdHandler.isBuiltInCommand(command)) {
                cb = BuiltInUICmdArray.find(builtInCmd => builtInCmd.command === command) as Omit<ICmdCallback<UICtx>, 'fn'>
            } else {
                cb = cmdHandler.getCallbackFromCommandName(command)
            }
            const { isService, isBuiltIn } = this.getCbConfig(cb, cmdHandler, userId)
            const ctxs = this.selectCtxs(cb, userId, cmdHandler)

            const configureAs = isService ?
                "service" :
                isBuiltIn ?
                    "built-in" :
                    "function"

            let desc: ICommandDescriptor = this.configureDescriptors(
                configureAs, cb, command, cmdHandler, ctx
            )

            const res = builder.startBuild(userId, command, desc, ctxs)

            return {
                success: true,
                text: res.text,
                markup: res.options
            }
        }
        return
    }

    private async handleBuildProcess(userId: string, command: string, ctx: UICtx, builder: CommandBuilder, cmdHandler: MotherCmdHandler<UICtx>): Promise<ICmdHandlerResponce|void> {
        if (builder.isUserOnBuild(userId)) {
            const res = builder.handle(userId, command)

            if (res.built) {
                console.log("@-- cmd build done --@")
                return await cmdHandler.execute(userId, res.built.command, res.built.args, ctx)
            }

            return {
                success: !Boolean(res.error),
                text: res.markup.text,
                markup: res.markup.options
            }
        }
        return
    }

    public async handle(request: ICmdHandlerRequest<UICtx>): Promise<ICmdHandlerResponce> {
        const { command, userId, uiCtx, args, currentCmdHandler } = request

        const builder = currentCmdHandler.CommandBuilder
        const builderRes = await this.handleBuildProcess(userId, command, uiCtx, builder, currentCmdHandler)
        if (builderRes) {
            return builderRes
        }

        const buildSetupRes = await this.startNewBuild(userId, command, args, uiCtx, builder, currentCmdHandler)
        if (buildSetupRes) {
            return buildSetupRes
        }

        return await super.handle(request)
    }
}
