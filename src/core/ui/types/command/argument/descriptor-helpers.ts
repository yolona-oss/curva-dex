import log from "@core/application/logger";
import { isOptionSetterFunc } from "./option";
import { ArgumentDescriptorType, IArgumentDescriptor } from "./descriptor";
import { CmdArgumentMeta } from "./meta";

export function validateArgumentDescriptor(desc: CmdArgumentMeta|IArgumentDescriptor) {
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

export function getArgumentDescType(desc: IArgumentDescriptor): ArgumentDescriptorType {
    if (desc.standalone === true && (desc.position != null)) {
        return 'standalone'
    } else if (desc.position != null && (desc.position > 0 && desc.standalone === false)) {
        return 'positional'
    } else if (desc.standalone === false && desc.position == null) {
        return 'pair'
    } else {
        log.error(`Invalid argument descriptor: ${JSON.stringify(desc, null, 2)}`)
        throw 'Invalid argument descriptor'
    }
}

export function isArgumentDescStandalone(desc: IArgumentDescriptor) {
    return getArgumentDescType(desc) === 'standalone'
}

export function isArgumentDescPositional(desc: IArgumentDescriptor) {
    return getArgumentDescType(desc) === 'positional'
}

export function isArgumentDescPair(desc: IArgumentDescriptor) {
    return getArgumentDescType(desc) === 'pair'
}
