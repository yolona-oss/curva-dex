import { MasterTraderCtrl } from '@bots/traider/mtc'
import { GabaState } from './state'
import { CmdError } from '@paragon/Types/CmdError'

import logger from '@logger';
import { MTC_OfferBuilder } from '@bots/traider/mtc-offer-builder'

export async function getNativeBalance<MasterType extends MasterTraderCtrl<any,any>>(this: GabaState<MasterType>, ...inputs: any[]): Promise<CmdError> {
    const slaveId = inputs[0]
    try {
        const balance = await this.master.getSalveBalanceNative(slaveId)
        return new CmdError(true, balance.amount)
    } catch (e: any) {
        log.error(e)
        return new CmdError(false, undefined, e)
    }
}

export async function getTokenBalance<MasterType extends MasterTraderCtrl<any,any>>(this: GabaState<MasterType>, ...inputs: any[]): Promise<CmdError> {
    const slaveId = inputs[0]
    const mint = inputs[1]
    try {
        const balance = await this.master.getSlaveBalanceForAsset(slaveId, mint)
        if (!balance) {
            return new CmdError(true, 0n)
        }
        return new CmdError(true, balance.amount)
    } catch (e: any) {
        log.error(e)
        return new CmdError(false, undefined, e)
    }
}

//async async function pushOffer<MasterType extends MasterTraderCtrl<any,any>>(this: GabaState<MasterType>, ...inputs: any[]): Promise<CmdError> {
//    const slaveId = inputs[0]
//    const side = inputs[1]
//    const maxSpent = inputs[2]
//    const cfgBuiler = new MTC_OfferBuilder()
//    cfgBuiler.offerBuilder.setMaxSpent(maxSpent)
//    try {
//        await this.master.pushTradeToQueue(slaveId, side, cfgBuiler.build())
//        return new CmdError(true)
//    } catch (e: any) {
//        log.error(e)
//        return new CmdError(false, undefined, e)
//    }
//}
