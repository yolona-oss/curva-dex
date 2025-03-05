import { exposeCmdArgumentDefOptions } from "@core/ui/types/command";
import { BuiltInUICmdArray } from "../built-in-cmd";
import { BaseCommandService } from "../command-service";
import { ICmdCallback, ICmdService, ICommandDescriptor, ICommandDescriptorArg, ReadingCtxType } from "../types";
import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext } from "./abstract-handler";
import { IManager, Manager } from "@core/db";
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

    // TODO: merge all assignin to one loop
    private async configureServiceDesc(service: ICmdService, userId: string, cmdHandler: MotherCmdHandler<UICtx>, isActive: boolean): Promise<ICommandDescriptor> {
        const manager = await Manager.findOne({ userId })!

        const cfgServiceDesc = service.configDescriptor()
        const cfg_args: ICommandDescriptorArg[] = []

        for (const key in cfgServiceDesc) {
            const options = cfgServiceDesc[key].options ? exposeCmdArgumentDefOptions(cfgServiceDesc[key].options, cmdHandler, manager as IManager) : undefined
            const validator = cfgServiceDesc[key].validator
            cfg_args.push({
                ctx: 'config',
                validator,
                options,
                name: key
            })
        }

        const paramServiceDesc = service.paramsDescriptor()
        const params_args: ICommandDescriptorArg[] = []

        for (const key in paramServiceDesc) {
            const options = paramServiceDesc[key].options ? exposeCmdArgumentDefOptions(paramServiceDesc[key].options, cmdHandler, manager as IManager) : undefined
            const validator = paramServiceDesc[key].validator
            params_args.push({
                ctx: 'params',
                validator,
                options,
                name: key
            })
        }

        const msgServiceDesc = service.receiveMsgDescriptor()
        const msg_args: ICommandDescriptorArg[] = []

        for (const key in msgServiceDesc) {
            const options = msgServiceDesc[key].options ? exposeCmdArgumentDefOptions(msgServiceDesc[key].options, cmdHandler, manager as IManager) : undefined
            const validator = msgServiceDesc[key].validator
            msg_args.push({
                ctx: 'message',
                validator,
                options,
                name: key
            })
        }
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
    private async configureDescriptors(configureAs: "function" | "service" | "built-in", userId: string, cb: ICmdCallbackOrBuiltIn<UICtx>, command: string, cmdHandler: MotherCmdHandler<UICtx>, ctx: UICtx): Promise<ICommandDescriptor> {
        switch (configureAs) {
            case "function":
                return this.configureFunctionDesc(cb as ICmdCallback<UICtx>, cmdHandler, ctx)
            case "service":
                if (!('fn' in cb)) {
                    throw new Error(`configureAs: "service" but no fn in callback`)
                }
                const { isActive } = this.getCbConfig(cb, cmdHandler, String(ctx.manager!.userId))
                return await this.configureServiceDesc(cb.fn as ICmdService, userId, cmdHandler, isActive)
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

            let desc: ICommandDescriptor = await this.configureDescriptors(
                configureAs, userId, cb, command, cmdHandler, ctx
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
