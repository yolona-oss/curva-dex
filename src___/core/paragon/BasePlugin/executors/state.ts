import { BaseState, BaseStateSign } from '@paragon/Types/State'
import { BASE_ACTIONS } from './constants'

export const actions = [
    BASE_ACTIONS.Dummy,
    BASE_ACTIONS.SetVariable,
    BASE_ACTIONS.RemoveVariable,
    BASE_ACTIONS.ExistsVariable,
    BASE_ACTIONS.Sleep,
]

export type BaseActions = typeof actions[number]

export interface State extends BaseState { }
export const StateSign = BaseStateSign
