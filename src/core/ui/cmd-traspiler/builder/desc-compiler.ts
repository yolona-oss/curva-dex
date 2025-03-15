import { BaseUIContext } from "@core/ui"
import { IArgumentDescriptor, IUICommandDescriptor } from "@core/ui/types"
import { IComposerUICmdCallback } from "./../types"
import { ICmdService } from "@core/ui/types/command";
import { CmdArgumentContextType } from "@core/ui/types/command";
import { CHComposer } from "./../ch-composer"
import { IManager, Manager } from "@core/db"
import { CmdArgumentMeta, exposeCmdArgumentOptions } from "@core/ui/types/command"

export class CBDescriptorCompiler<UICtx extends BaseUIContext> {
    constructor() { }

    compile(command: string, userId: string, mother: CHComposer<UICtx>, ctx: UICtx) {
        const cb = mother.getCallbackFromCommandName(command)
        const configureAs = mother.isService(command) ? "service" : "function"

        return this.configureDescriptors(configureAs, userId, cb, command, mother, ctx)
    }

    private async configureServiceDesc(service: ICmdService, userId: string, chComposer: CHComposer<UICtx>): Promise<IUICommandDescriptor> {
        const manager = await Manager.findOne({ userId })!

        const serviceArgCtx: CmdArgumentContextType[] = ['params', 'config', 'message']
        const builderArgs: IArgumentDescriptor[] = new Array()
        for (const ctxName of serviceArgCtx) {
            const descriptor: Record<string, CmdArgumentMeta> = service[ctxName === 'message' ? 'receiveMsgDescriptor' : ctxName === 'config' ? 'configDescriptor' : 'paramsDescriptor']()
            //console.log(`Descriptor: ${service.name}:${ctxName}`, JSON.stringify(descriptor, null, 4))

            for (const key in descriptor) {
                const options = descriptor[key].pairOptions ?
                    await exposeCmdArgumentOptions(service.name, descriptor[key].pairOptions, chComposer, manager as IManager)
                    :
                    undefined;
                builderArgs.push({
                    ...descriptor[key],
                    ctx: ctxName,
                    pairOptions: options,
                    name: key
                })
            }
        }
        const isActive = chComposer.isServiceActive(userId, service.name)
        return {
            args: isActive ? builderArgs.filter(a => a.ctx === 'message') : builderArgs.filter(a => a.ctx !== 'message')
        }
    }

    private async configureFunctionDesc(command: string, cb: IComposerUICmdCallback<UICtx>, chComposer: CHComposer<UICtx>, ctx: UICtx): Promise<IUICommandDescriptor> {
        const promise = cb.args?.map(async (a) => ({
            ctx: 'args' as CmdArgumentContextType,
            name: a.name,
            required: a.required,
            standalone: a.standalone,
            description: a.description,
            pairOptions: await exposeCmdArgumentOptions(command, a.pairOptions, chComposer, ctx.manager as IManager),
            position: a.position,
            validator: a.validator
        })) ?? []

        const args = await Promise.all(promise)
        return {
            args: args
        }
    }

    // TODO set configreAs types in other place and disperce to all code base
    private async configureDescriptors(configureAs: "function" | "service", userId: string, cb: IComposerUICmdCallback<UICtx>, command: string, chComposer: CHComposer<UICtx>, ctx: UICtx): Promise<IUICommandDescriptor> {
        switch (configureAs) {
            case "function":
                return this.configureFunctionDesc(command, cb as IComposerUICmdCallback<UICtx>, chComposer, ctx)
            case "service":
                return await this.configureServiceDesc(cb.callback as ICmdService, userId, chComposer)
        }
    }

}
