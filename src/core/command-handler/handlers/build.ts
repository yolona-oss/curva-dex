import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext } from "./abstract-handler";
import { CommandBuilder } from "../command-builder";
import { CHComposer } from "../ch-composer";
import log from "@core/utils/logger";
import { CommandBuilderDescCompiler } from "../command-builder-desc-compiler";
import { IBuilderCmdDesc } from "../types";

// TODO add completion for builtin commands

export class HandleCmdBuilder<UICtx extends BaseUIContext> extends AbstractCmdHandler<UICtx> {

    private async startNewBuild(userId: string, command: string, args: string[], ctx: UICtx, builder: CommandBuilder, chComposer: CHComposer<UICtx>): Promise<ICmdHandlerResponce|void> {
        log.trace(`Checking for availability to start build: ${command}`)
        log.trace(`Command: `, command, `Args: `, args)
        if (!chComposer.isAllArgsPassed(command, args)) {
            const avalibleCtxs = CommandBuilder.selectReadingContexts(command, userId, chComposer)

            const descCompiler = new CommandBuilderDescCompiler<UICtx>()
            let desc: IBuilderCmdDesc = await descCompiler.compile(
                command,
                userId,
                chComposer,
                ctx
            )

            const res = builder.startBuild(userId, command, desc, avalibleCtxs)

            return {
                success: true,
                text: res.text,
                markup: res.options
            }
        }
        return
    }

    private async handleBuildProcess(userId: string, command: string, ctx: UICtx, builder: CommandBuilder, chComposer: CHComposer<UICtx>): Promise<ICmdHandlerResponce|void> {
        if (builder.isUserOnBuild(userId)) {
            const res = builder.handle(userId, command)

            if (res.built) {
                log.trace("@-- cmd build done --@")
                return await chComposer.CommandExecutor.execute(userId, res.built.command, res.built.args, ctx)
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
        const { command, userId, uiCtx, args, composer } = request

        const builder = composer.CommandBuilder
        const builderRes = await this.handleBuildProcess(userId, command, uiCtx, builder, composer)
        if (builderRes) {
            return builderRes
        }

        try {
            const buildSetupRes = await this.startNewBuild(userId, command, args, uiCtx, builder, composer)
            if (buildSetupRes) {
                return buildSetupRes
            }
        } catch(e: any) {
            log.trace(`Cannot start build command: "${command}"`, e)
        }

        return await super.handle(request)
    }
}
