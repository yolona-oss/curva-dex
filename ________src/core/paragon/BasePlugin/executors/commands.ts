import * as ss from 'superstruct'
import { Command } from '@paragon/Types/Command'
import { State } from './state'
import * as cmd from './common'
import { BASE_ACTIONS } from './constants'

export const commands: Command<State>[] = [
    {
        name: BASE_ACTIONS.SetVariable,
        description: "Settings new variable or updating an exists",
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "Variable name",
                path: "name"
            },
            {
                position: 1,
                type: new ss.Struct({ type: "any", schema: null }),
                description: "Variable value",
                path: "value"
            }
        ],
        returnValue: ss.never(),
        fn: cmd.SetVariable
    },
    {
        name: BASE_ACTIONS.ExistsVariable,
        description: "Check for variable existance",
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "Variable name",
                path: "name"
            }
        ],
        returnValue: ss.never(),
        fn: cmd.ExistsVariable
    },
    {
        name: BASE_ACTIONS.RemoveVariable,
        description: "Removing variable",
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "Variable name",
                path: "name"
            }
        ],
        returnValue: ss.never(),
        fn: cmd.RemoveVariable
    },
    {
        name: BASE_ACTIONS.Dummy,
        description: "Do nothing",
        inputs: [],
        returnValue: ss.never(),
        fn: cmd.Dummy
    },

]
