import { IBuilderMarkupOption } from "../types/builder"

export const DefaultBuilderCallbacks = {
    execute: "__execute",
    cancel: "__cancel",
    switchCtx: "__switchCtx"
}

export const defaultBuilderMarkupOptions: IBuilderMarkupOption[] = [
    {
        text: "Execute",
        callback_data: DefaultBuilderCallbacks.execute
    },
    {
        text: "Cancel",
        callback_data: DefaultBuilderCallbacks.cancel
    },
    {
        text: "Select reading context",
        callback_data: DefaultBuilderCallbacks.cancel
    }
]
