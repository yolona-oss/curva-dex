import { ICmdBuilderMarkupOption } from "../types/builder"

export const DefaultBuilderCallbacks = {
    execute: "__execute",
    cancel: "__cancel",
    switchCtx: "__switchCtx"
}

export const defaultBuilderMarkupOptions: ICmdBuilderMarkupOption[] = [
    {
        text: "Execute",
        type: "defaultMk",
        callback_data: DefaultBuilderCallbacks.execute
    },
    {
        text: "Cancel",
        type: "defaultMk",
        callback_data: DefaultBuilderCallbacks.cancel
    },
    {
        text: "Select reading context",
        type: "defaultMk",
        callback_data: DefaultBuilderCallbacks.switchCtx
    },
]
