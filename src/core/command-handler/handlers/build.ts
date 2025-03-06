import { BaseCommandArgumentDesc, exposeCmdArgumentDefOptions } from "@core/ui/types/command";
import { BaseCommandService } from "../command-service";
import { ICmdCallback, ICmdService, IBuilderCmdDesc, IBuilderCmdArgDesc, ReadingCtxType } from "../types";
import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext } from "./abstract-handler";
import { IManager, Manager } from "@core/db";
import { CommandBuilder } from "../command-builder";
import { MotherCmdHandler } from "../mother-cmd-handler";

// TODO add completion for builtin commands

export class HandleCmdBuilder<UICtx extends BaseUIContext> extends AbstractCmdHandler<UICtx> {

    private getCbConfig(cb: ICmdCallback<UICtx>, handler: MotherCmdHandler<UICtx>, userId: string) {
        const isService = cb.execMixin instanceof BaseCommandService
        const isActive = isService ? handler.isServiceActive(userId, cb.execMixin.name) : false

        return {
            isService,
            isActive,
        }
    }

    private selectCtxs(cb: ICmdCallback<UICtx>, userId: string, handler: MotherCmdHandler<UICtx>): ReadingCtxType[] {
        const { isService, isActive } = this.getCbConfig(cb, handler, userId)

        return isService ?
            isActive ?
                ['message'] :
                ['params', 'config'] :
            ['args']
    }

    private async configureServiceDesc(service: ICmdService, userId: string, cmdHandler: MotherCmdHandler<UICtx>, isActive: boolean): Promise<IBuilderCmdDesc> {
        const manager = await Manager.findOne({ userId })!

        const serviceArgCtx: ReadingCtxType[] = ['params', 'config', 'message']
        const builderArgs: IBuilderCmdArgDesc[] = []
        for (const ctxName of serviceArgCtx) {
            const descriptor: Record<string, BaseCommandArgumentDesc> = service[ctxName === 'message' ? 'receiveMsgDescriptor' : ctxName === 'config' ? 'configDescriptor' : 'paramsDescriptor']()

            for (const key in descriptor) {
                const options = descriptor[key].pairOptions ?
                    await exposeCmdArgumentDefOptions(service.name, descriptor[key].pairOptions, cmdHandler, manager as IManager)
                    :
                    undefined
                builderArgs.push({
                    ...descriptor[key],
                    ctx: ctxName,
                    pairOptions: options,
                    name: key
                })
            }
        }
        return {
            args: isActive ? builderArgs.filter(a => a.ctx === 'message') : builderArgs.filter(a => a.ctx !== 'message')
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
