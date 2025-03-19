import log from "@core/application/logger";
import { isOptionSetterFunc } from "./option";
import { ArgumentDescriptorType, IArgumentCompiled, IArgumentDescriptor, IArgumentIdent } from "./descriptor";
import { CmdArgumentMetadataRaw } from "./meta";
import { encodePositionalName } from ".";

export function validateArgumentDescriptor(desc: CmdArgumentMetadataRaw|IArgumentDescriptor) {
    if (desc.position != null && desc.position <= 0) {
        throw new Error(`position must be greater than 0`)
    }
    if (desc.standalone) {
        if (desc.position != null) {
            throw new Error(`standalone and position can't be used together`)
        }
        if (desc.defaultValue != null) {
            throw new Error(`standalone and defaultValue can't be used together`)
        }
        if (desc.pairOptions != undefined && (desc.pairOptions.length > 0 || isOptionSetterFunc(desc.pairOptions))) {
            throw new Error(`standalone and pairOptions can't be used together`)
        }
    }
}

export function getArgumentDescType(desc: IArgumentDescriptor|IArgumentIdent): ArgumentDescriptorType {
    if ('isPair' in desc && desc.isPair === true) {
        return 'pair'
    } else if ('standalone' in desc && desc.standalone === true) {
        return 'standalone'
    } else if ('position' in desc && Number.isNaN(desc.position) === false) {
        return 'positional'
    } else {
        log.error(`Argument descriptor must have one of position or standalone, or field isPair will be set to true`)
        return 'pair'
    }
}

export function isArgumentDescStandalone(desc: IArgumentDescriptor|IArgumentIdent) {
    return getArgumentDescType(desc) === 'standalone'
}

export function isArgumentDescPositional(desc: IArgumentDescriptor|IArgumentIdent) {
    return getArgumentDescType(desc) === 'positional'
}

export function isArgumentDescPair(desc: IArgumentDescriptor|IArgumentIdent) {
    return getArgumentDescType(desc) === 'pair'
}

export function useDescriptorCreateArgument(desc: IArgumentDescriptor|IArgumentIdent, value: string): IArgumentCompiled {
    if (isArgumentDescStandalone(desc)) {
        return {
            name: desc.name,
            value: '__standalone__',
            standalone: true,
            ctx: desc.ctx
        }
    } else if (isArgumentDescPositional(desc)) {
        return {
            name: encodePositionalName(desc.name, desc.position!),
            value: value,
            position: desc.position,
            ctx: desc.ctx
        }
    } else {
        return {
            name: desc.name,
            value: value,
            isPair: true,
            ctx: desc.ctx
        }
    }
}
