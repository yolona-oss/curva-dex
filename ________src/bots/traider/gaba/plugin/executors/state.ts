import { MasterTraderCtrl } from '@bots/traider/mtc'
import { BaseState } from '@paragon/Types/State'

export interface GabaState<
    MasterType extends MasterTraderCtrl<any,any> = MasterTraderCtrl<any,any>
    >
    extends BaseState {
    master: MasterType
}
