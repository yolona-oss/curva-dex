import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext } from "./abstract-handler";
import { CommandBuilder } from "../builder";
import { CHComposer } from "../ch-composer";
import log from "@core/utils/logger";
import { CBDescriptorCompiler } from "../builder/desc-compiler";
import { ICommandDescriptor } from "../builder";

// TODO add completion for builtin commands

export class HandleCmdBuilder<UICtx extends BaseUIContext> extends AbstractCmdHandler<UICtx> {

    private async startNewBuild(userId: string, command: string, args: string[], ctx: UICtx, builder: CommandBuilder, chComposer: CHComposer<UICtx>): Promise<ICmdHandlerResponce|void> {
        log.trace(`Checking for availability to start build: ${command}`)
        log.trace(`Command: `, command, `Args: `, args)
        if (!chComposer.isAllArgsPassed(command, args)) {
            const avalibleCtxs = CommandBuilder.selectReadingContexts(command, userId, chComposer)

            const descCompiler = new CBDescriptorCompiler<UICtx>()
            let desc: ICommandDescriptor = await descCompiler.compile(
                command,
                userId,
                chComposer,
                ctx
            )

            const res = builder.startBuild(userId, command, desc, avalibleCtxs)

            return {
                success: true,
                markup: res
            }
        }
        return
    }

    private async handleBuildProcess(userId: string, text: string, ctx: UICtx, builder: CommandBuilder, chComposer: CHComposer<UICtx>): Promise<ICmdHandlerResponce|void> {
        if (builder.isUserOnBuild(userId)) {
            const stepRes = builder.handle(userId, text)

            if (stepRes.IsBuilt) {
                return await chComposer.CommandInvoker.invoke(userId, stepRes.Result, ctx)
            }

            return {
                success: !Boolean(stepRes),
                ...stepRes.Markup
            }
        }
        return
    }

    public async handle(request: ICmdHandlerRequest<UICtx>): Promise<ICmdHandlerResponce> {
        const { command, text, userId, uiCtx, args, composer } = request

        const builder = composer.CommandBuilder
        const builderRes = await this.handleBuildProcess(userId, text, uiCtx, builder, composer)
        if (builderRes) {
            return builderRes
        }

        try {
            const buildSetupRes = await this.startNewBuild(userId, command, args, uiCtx, builder, composer)
            if (buildSetupRes) {
                return buildSetupRes
            }
        } catch(e: any) {
            log.error(`Cannot start build command: "${command}"`, e)
        }

        return await super.handle(request)
    }
}
