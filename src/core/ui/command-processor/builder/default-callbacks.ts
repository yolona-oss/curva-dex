// TODO: rename file
import { asId } from "@core/types/identificable";

export const BuilderActionSigns = {
    execute: asId("__execute"),
    cancelBuild: asId("__cancelBuild"),
    switchCtx: asId("__switchctx"),
    cancelOp: asId("__cancelOp")
}

export function isBuilderActionSign(input: string) {
    return [
        BuilderActionSigns.cancelBuild,
        BuilderActionSigns.execute,
        BuilderActionSigns.switchCtx
    ].includes(input)
}
