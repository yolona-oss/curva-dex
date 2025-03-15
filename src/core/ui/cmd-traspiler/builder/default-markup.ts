import { IMarkupOption } from "../types/markup"
import { DefaultBuilderCallbacks } from "./default-callbacks"

export const defaultBuilderMarkupOptions: IMarkupOption[] = [
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
