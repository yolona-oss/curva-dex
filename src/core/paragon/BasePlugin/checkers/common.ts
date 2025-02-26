import * as ss from 'superstruct'
import { CheckObj, check_path } from '@paragon/Types/Conditional'
import { BASE_CHECKERS } from './constants'

// TODO maybe use transformers for checkers inputs instead of use check_path?
// and in 69eb61fc65c6bb6334f1c4973fd9fa62c624c01b Mon Jul 18 19:42:41 2022 inputs interpriating directly inside script executor not like in CommandExecutor<>
export const checkers: CheckObj[] = [
    {
        name: BASE_CHECKERS.Success,
        inputs: [],
        fn: async (cmdRet) => {
            return cmdRet.Ok()
        }
    },
    {
        name: BASE_CHECKERS.Failure,
        inputs: [],
        fn: async (cmdRet) => {
            return !cmdRet.Ok()
        }
    },
    {
        name: BASE_CHECKERS.Contains,
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "",
                path: check_path("value")
            }
        ],
        fn: async (cmdRet, inputs) => {
            return cmdRet.returnValue && cmdRet.returnValue.includes(inputs[0])
        }
    },
    {
        name: BASE_CHECKERS.NotContains,
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "",
                path: check_path("value")
            }
        ],
        fn: async (cmdRet, inputs) => {
            return cmdRet.returnValue && !cmdRet.returnValue.includes(inputs[0])
        }
    },
    {
        name: BASE_CHECKERS.Equals,
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "",
                path: check_path("value")
            }
        ],
        fn: async (cmdRet, inputs) => {
            return cmdRet.returnValue && cmdRet.returnValue === inputs[0]
        }
    },
    {
        name: BASE_CHECKERS.NotEquals,
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "",
                path: check_path("value")
            }
        ],
        fn: async (cmdRet, inputs) => {
            return cmdRet.returnValue && cmdRet.returnValue !== inputs[0]
        }
    },
]
