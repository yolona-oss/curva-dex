// TODO: rename file
import { asId } from "@core/types/identificable";

export const BuilderActionSigns = {
    execute: asId(crypto.randomUUID()),
    cancelBuild: asId(crypto.randomUUID()),
    switchCtx: asId(crypto.randomUUID()),
    cancelOp: asId(crypto.randomUUID()),
    changeInterpritationMode: asId(crypto.randomUUID())
}

export function isBuilderActionSign(input: string) {
    return [
        BuilderActionSigns.cancelBuild,
        BuilderActionSigns.execute,
        BuilderActionSigns.switchCtx
    ].includes(input)
}
