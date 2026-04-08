import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler";
import { BaseUIContext } from "@core/ui/types";
import { CommandBuilder } from "../builder";
import { CmdDispatcher } from "../dispatcher";
import log from '@logger';
import { CBDescriptorCompiler } from "../builder/desc-compiler";
import { IUICommandDescriptor } from "@core/ui/types";

// TODO add completion for builtin commands

export class HandleCmdBuilder<UICtx extends BaseUIContext> extends AbstractCmdHandler<UICtx> {

    private async startNewBuild(userId: string, command: string, args: string[], ctx: UICtx, builder: CommandBuilder, dispatcher: CmdDispatcher<UICtx>): Promise<ICmdHandlerResponce|void> {
        log.trace(`Checking for availability to start build: ${command}`)
        log.trace(`Command: ${command}\nArgs: ${args}`)
        if (!dispatcher.isAllArgsPassed(command, args)) {
            const avalibleCtxs = CommandBuilder.selectReadingContexts(command, userId, dispatcher)

            const descCompiler = new CBDescriptorCompiler<UICtx>()
            let desc: IUICommandDescriptor = await descCompiler.compile(
                command,
                userId,
                dispatcher,
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

    private async handleBuildProcess(userId: string, text: string, ctx: UICtx, builder: CommandBuilder, dispatcher: CmdDispatcher<UICtx>, uiImpl: any): Promise<ICmdHandlerResponce|void> {
        if (builder.isUserOnBuild(userId)) {
            const stepRes = builder.handle(userId, text)

            if (stepRes.IsCompiled) {
                log.trace(`Build done: invoking command: ${stepRes.Result.command}`)
                return await dispatcher.CommandInvoker.invoke(userId, stepRes.Result, ctx, uiImpl)
            }

            return {
                success: !Boolean(stepRes),
                markup: stepRes.Markup
            }
        }
        return
    }

    public async handle(request: ICmdHandlerRequest<UICtx>): Promise<ICmdHandlerResponce> {
        const { command, text, userId, uiCtx, uiImpl, words: args, dispatcher } = request

        const builder = dispatcher.CommandBuilder
        const builderRes = await this.handleBuildProcess(userId, text, uiCtx, builder, dispatcher, uiImpl)
        if (builderRes) {
            return builderRes
        }

        try {
            const buildSetupRes = await this.startNewBuild(userId, command, args, uiCtx, builder, dispatcher)
            if (buildSetupRes) {
                return buildSetupRes
            }
        } catch(e: any) {
            log.error(`Cannot start build command: "${command}"`, e)
        }

        return await super.handle(request)
    }
}
