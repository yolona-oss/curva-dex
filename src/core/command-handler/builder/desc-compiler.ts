import { BaseUIContext } from "@core/ui"
import { ICommandArgumentDesc, ICommandDescriptor } from "./types"
import { ICmdCallback, ICmdService } from "./../types"
import { CmdArgumentContextType } from "@core/ui/types/command";
import { CHComposer } from "./../ch-composer"
import { IManager, Manager } from "@core/db"
import { BaseCommandArgumentDesc, exposeCmdArgumentDefOptions } from "@core/ui/types/command"

export class CBDescriptorCompiler<UICtx extends BaseUIContext> {
    constructor() { }

    compile(command: string, userId: string, mother: CHComposer<UICtx>, ctx: UICtx) {
        const cb = mother.getCallbackFromCommandName(command)
        const configureAs = mother.isService(command) ? "service" : "function"

        return this.configureDescriptors(configureAs, userId, cb, command, mother, ctx)
    }

    private async configureServiceDesc(service: ICmdService, userId: string, chComposer: CHComposer<UICtx>): Promise<ICommandDescriptor> {
        const manager = await Manager.findOne({ userId })!

        const serviceArgCtx: CmdArgumentContextType[] = ['params', 'config', 'message']
        const builderArgs: ICommandArgumentDesc[] = new Array()
        for (const ctxName of serviceArgCtx) {
            const descriptor: Record<string, BaseCommandArgumentDesc> = service[ctxName === 'message' ? 'receiveMsgDescriptor' : ctxName === 'config' ? 'configDescriptor' : 'paramsDescriptor']()
            console.log(`Descriptor: ${service.name}:${ctxName}`, JSON.stringify(descriptor, null, 4))

            for (const key in descriptor) {
                const options = descriptor[key].pairOptions ?
                    await exposeCmdArgumentDefOptions(service.name, descriptor[key].pairOptions, chComposer, manager as IManager)
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

    private async configureFunctionDesc(command: string, cb: ICmdCallback<UICtx>, chComposer: CHComposer<UICtx>, ctx: UICtx): Promise<ICommandDescriptor> {
        const promise = cb.args?.map(async (a) => ({
            ctx: 'args' as CmdArgumentContextType,
            name: a.name,
            description: a.description,
            pairOptions: await exposeCmdArgumentDefOptions(command, a.pairOptions, chComposer, ctx.manager as IManager),
            position: a.position,
            validator: a.validator
        })) ?? []

        const args = await Promise.all(promise)
        return {
            args: args
        }
    }

    // TODO set configreAs types in other place and disperce to all code base
    private async configureDescriptors(configureAs: "function" | "service", userId: string, cb: ICmdCallback<UICtx>, command: string, chComposer: CHComposer<UICtx>, ctx: UICtx): Promise<ICommandDescriptor> {
        switch (configureAs) {
            case "function":
                return this.configureFunctionDesc(command, cb as ICmdCallback<UICtx>, chComposer, ctx)
            case "service":
                return await this.configureServiceDesc(cb.execMixin as ICmdService, userId, chComposer)
        }
    }

}
