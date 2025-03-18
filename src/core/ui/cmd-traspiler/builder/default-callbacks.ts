import { asId } from "@core/types/identificable";

// INFO: must be lower case
export const DefaultBuilderCallbacks = {
    execute: asId("__execute"),
    cancelBuild: asId("__cancelBuild"),
    switchCtx: asId("__switchctx"),
    cancelOp: asId("__cancelOp")
}

export function isDefaultBuilderCallback(input: string) {
    return [
        DefaultBuilderCallbacks.cancelBuild,
        DefaultBuilderCallbacks.execute,
        DefaultBuilderCallbacks.switchCtx
    ].includes(input)
}
