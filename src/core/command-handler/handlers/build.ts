import { exposeCmdArgumentDefOptions } from "@core/ui/types/command";
import { BuiltInUICmdArray } from "../built-in-cmd";
import { BaseCommandService } from "../command-service";
import { ICmdCallback, ICmdService, IBuilderCmdDesc, IBuilderCmdArgDesc, ReadingCtxType } from "../types";
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
            isService = cb.execMixin instanceof BaseCommandService
            isActive = isService ? handler.isServiceActive(userId, cb.execMixin.name) : false
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
    private async configureServiceDesc(service: ICmdService, userId: string, cmdHandler: MotherCmdHandler<UICtx>, isActive: boolean): Promise<IBuilderCmdDesc> {
        const manager = await Manager.findOne({ userId })!

        const cfgServiceDesc = service.configDescriptor()
        const cfg_args: IBuilderCmdArgDesc[] = []

        for (const key in cfgServiceDesc) {
            const options = cfgServiceDesc[key]?.pairOptions ?
                await exposeCmdArgumentDefOptions(service.name, cfgServiceDesc[key].pairOptions, cmdHandler, manager as IManager)
                :
                undefined
            cfg_args.push({
                ...cfgServiceDesc[key],
                ctx: 'config',
                pairOptions: options,
                name: key,
            })
        }

        const paramServiceDesc = service.paramsDescriptor()
        const params_args: IBuilderCmdArgDesc[] = []

        for (const key in paramServiceDesc) {
            const options = paramServiceDesc[key].pairOptions ?
                await exposeCmdArgumentDefOptions(service.name, paramServiceDesc[key].pairOptions, cmdHandler, manager as IManager)
                :
                undefined
            params_args.push({
                ...paramServiceDesc[key],
                ctx: 'params',
                pairOptions: options,
                name: key
            })
        }

        const msgServiceDesc = service.receiveMsgDescriptor()
        const msg_args: IBuilderCmdArgDesc[] = []

        for (const key in msgServiceDesc) {
            const options = msgServiceDesc[key].pairOptions ?
                await exposeCmdArgumentDefOptions(service.name, msgServiceDesc[key].pairOptions, cmdHandler, manager as IManager)
                :
                undefined
            msg_args.push({
                ...msgServiceDesc[key],
                ctx: 'message',
                pairOptions: options,
                name: key
            })
        }
        return {
            args: isActive ? msg_args : params_args.concat(cfg_args)
        }
    }

    private async configureFunctionDesc(cb: ICmdCallback<UICtx>, cmdHandler: MotherCmdHandler<UICtx>, ctx: UICtx): IBuilderCmdDesc {
        const commonCbArgs: IBuilderCmdArgDesc[] = cb.args?.map(a => ({
            ctx: 'args',
            name: a.name,
            description: a.description,
            options: a.options ? await exposeCmdArgumentDefOptions(a.options, cmdHandler, ctx.manager as IManager) : undefined,
            validator: a.validator
        })) ?? []

        return {
            args: commonCbArgs
        }
    }

    private async configureBuiltInDesc(command: string, cmdHandler: MotherCmdHandler<UICtx>, ctx: UICtx): Promise<IBuilderCmdDesc> {
        return {
            args: (BuiltInUICmdArray.find(c => c.command === command)?.args ?? []).map(a => ({
                ctx: 'args',
                name: a.name,
                description: a.description,
                options: a.options ? await exposeCmdArgumentDefOptions(a.options, cmdHandler, ctx.manager as IManager) : undefined,
                validator: a.validator
            }))
        }
    }

    // TODO set configreAs types in other place and disperce to all code base
    private async configureDescriptors(configureAs: "function" | "service" | "built-in", userId: string, cb: ICmdCallbackOrBuiltIn<UICtx>, command: string, cmdHandler: MotherCmdHandler<UICtx>, ctx: UICtx): Promise<IBuilderCmdDesc> {
        switch (configureAs) {
            case "function":
                return this.configureFunctionDesc(cb as ICmdCallback<UICtx>, cmdHandler, ctx)
            case "service":
                if (!('fn' in cb)) {
                    throw new Error(`configureAs: "service" but no fn in callback`)
                }
                const { isActive } = this.getCbConfig(cb, cmdHandler, String(ctx.manager!.userId))
                return await this.configureServiceDesc(cb.execMixin as ICmdService, userId, cmdHandler, isActive)
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

            let desc: IBuilderCmdDesc = await this.configureDescriptors(
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
