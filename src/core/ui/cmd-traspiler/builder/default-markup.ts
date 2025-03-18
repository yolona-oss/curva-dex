import { IMarkupButton } from "../types/markup"
import { DefaultBuilderCallbacks } from "./default-callbacks"

export type BuilderMarkupsTypes = 'default' | 'selection'
export type ButtonType = 'execute' | 'cancelBuild' | 'cancelOp' | 'changeCtx'

const Buttons: Record<ButtonType, IMarkupButton> = {
    execute: {
        text: "Execute",
        type: "aux",
        data: DefaultBuilderCallbacks.execute
    },

    cancelBuild: {
        text: "Cancel",
        type: "aux",
        data: DefaultBuilderCallbacks.cancelBuild
    },

    cancelOp: {
        text: "Cancel operation",
        type: "aux",
        data: DefaultBuilderCallbacks.cancelOp
    },

    changeCtx: {
        text: "Select reading context",
        type: "aux",
        data: DefaultBuilderCallbacks.switchCtx
    },
}

export const BuilderMarkups: Record<BuilderMarkupsTypes, Array<IMarkupButton>> = {
    default: [
        Buttons.execute,
        Buttons.cancelBuild,
        Buttons.changeCtx
    ],

    selection: [
        Buttons.cancelOp
    ]
}
