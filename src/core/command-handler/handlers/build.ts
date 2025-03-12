import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext } from "./abstract-handler";
import { CommandBuilder } from "../command-builder";
import { MotherCmdHandler } from "../mother-cmd-handler";
import log from "@core/utils/logger";
import { CommandBuilderDescCompiler } from "../command-builder-desc-compiler";
import { IBuilderCmdDesc } from "../types";

// TODO add completion for builtin commands

export class HandleCmdBuilder<UICtx extends BaseUIContext> extends AbstractCmdHandler<UICtx> {

    private async startNewBuild(userId: string, command: string, args: string[], ctx: UICtx, builder: CommandBuilder, cmdHandler: MotherCmdHandler<UICtx>): Promise<ICmdHandlerResponce|void> {
        console.log(`Checking for availability to start build: ${command}`)
        console.log(`Command: `, command, `Args: `, args)
        if (!cmdHandler.isAllArgsPassed(command, args)) {
            const avalibleCtxs = CommandBuilder.selectReadingContexts(command, userId, cmdHandler)

            const descCompiler = new CommandBuilderDescCompiler<UICtx>()
            let desc: IBuilderCmdDesc = await descCompiler.compile(
                command,
                userId,
                cmdHandler,
                ctx
            )

            console.log(`Build setup ${JSON.stringify(desc, null, 4)}`)
            const res = builder.startBuild(userId, command, desc, avalibleCtxs)

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
                return await cmdHandler.CommandExecutor.execute(userId, res.built.command, res.built.args, ctx)
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
        console.log("HANDLE", this.constructor.name)

        const { command, userId, uiCtx, args, currentCmdHandler } = request

        const builder = currentCmdHandler.CommandBuilder
        const builderRes = await this.handleBuildProcess(userId, command, uiCtx, builder, currentCmdHandler)
        if (builderRes) {
            return builderRes
        }

        try {
            const buildSetupRes = await this.startNewBuild(userId, command, args, uiCtx, builder, currentCmdHandler)
            if (buildSetupRes) {
                return buildSetupRes
            }
        } catch(e: any) {
            log.trace(`Cannot start build command: "${command}"`, e)
        }

        return await super.handle(request)
    }
}
