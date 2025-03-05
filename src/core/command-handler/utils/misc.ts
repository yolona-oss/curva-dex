import { IManager } from "@core/db"
import { MotherCmdHandler } from "../mother-cmd-handler"
import { genRandomString } from "@core/utils/random"
import { ArgOptionsSetter, ArgOptionValidator } from "../types"

export const sessionOpts: ArgOptionsSetter = async (servName: string, o: MotherCmdHandler<any>, manager: IManager) => {
    const avliableSessions = await o.UserServiceSessions(String(manager.userId), servName)
    return avliableSessions
}

export const sessionOptsWithRand: ArgOptionsSetter = async (servName: string, o: MotherCmdHandler<any>, manager: IManager) => {
    const avliableSessions = await sessionOpts(servName, o, manager)
    const randIds = new Array<string>(4).fill('').map(() => genRandomString(4))
    avliableSessions.push(...randIds)
    return avliableSessions
}

export const sessionIdValidator: ArgOptionValidator = (v: string) => Boolean(v.match(/^[0-9a-zA-Z]+$/))
