import { IUICommandSimple } from "@core/ui"
import { ICmdCallback, ICmdService } from "./types"

export const serviceToString = <Ctx>(cmdName: string, cmdCb: ICmdCallback<Ctx>) => {
    const executor = cmdCb.fn as ICmdService
    return `Service ${cmdName},\n
Description: ${cmdCb.description},\n
Params: ${JSON.stringify(executor.paramsEntries(), null, 4)},\n
Config: ${JSON.stringify(executor.configEntries(), null, 4)},\n
Next: ${cmdCb.next?.join(", ") ?? "None"}\n\
Prev: ${cmdCb.prev ?? "None"}\n\
`
}

export const commonToString = <Ctx>(cmdName: string, cmdCb: ICmdCallback<Ctx>) => {
    const argsStr = cmdCb.args?.map(a => a.name).join(", ")
    return `Command ${cmdName},\n\
Description: ${cmdCb.description},\n\
${argsStr ? `Args: ${argsStr}\n` : ""}\
Next: ${cmdCb.next?.join(", ") ?? "None"}\n\
Prev: ${cmdCb.prev ?? "None"}\
`
}

export const uiCommandsToString = (commands: IUICommandSimple[]): string => {
    return commands.map(v => {
        const argsStr = v.args?.map(a => a.name).join(", ")
        return `Command: ${v.command},\n\
Description: ${v.description},\n\
${argsStr ? `Args: ${argsStr}\n` : ""}\
`
    }).join("\n")
}
