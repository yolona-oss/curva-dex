import { ICmdBuilderMarkupOption } from "../types/builder"

// INFO: must be lower case
export const DefaultBuilderCallbacks = {
    execute: "__execute",
    cancel: "__cancel",
    switchCtx: "__switchctx"
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
