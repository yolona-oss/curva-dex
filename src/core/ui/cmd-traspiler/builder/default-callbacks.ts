import { asId } from "@core/types/identificable";

// INFO: must be lower case
export const DefaultBuilderCallbacks = {
    execute: asId("__execute"),
    cancel: asId("__cancel"),
    switchCtx: asId("__switchctx")
}

export function isDefaultBuilderCallback(input: string) {
    return [
        DefaultBuilderCallbacks.cancel,
        DefaultBuilderCallbacks.execute,
        DefaultBuilderCallbacks.switchCtx
    ].includes(input)
}
