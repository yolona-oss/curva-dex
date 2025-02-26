// TODO move to types
import { script, scriptAction } from './script.js'
import * as ss from 'superstruct'
import { scriptActionSign } from './script.js'

export interface BaseState {
    actions_list: scriptAction[]
    variables: Map<string, any>
    buffer: string
    cur_action_try: number
}

export const BaseStateSign = ss.object({
    actions_list: ss.array(scriptActionSign),
    variables: ss.map(ss.string(), ss.any()),
    buffer: ss.string(),
    cur_action_try: ss.number()
})
