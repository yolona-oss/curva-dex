import { genRandomString } from "@core/utils/random";

import { sessionIdValidator, sessionOptsWithRand } from "./utils/misc";

import 'reflect-metadata'
import { CmdArgument, CommandArgmuentKeyHolder, CommandArgumentMetadata, getCmdArgMetadata, getCmdArgUndefMetadata } from "@core/ui/types/command";

export function toDescriptor<T extends CommandArgmuentKeyHolder>(instance: T): CommandArgumentMetadata<keyof T> {
    return getCmdArgMetadata(instance)
}

export abstract class BaseServiceConfig {
}

export class BaseServiceParameters {
    @CmdArgument({
        required: false,
        standalone: false,
        pairOptions: sessionOptsWithRand,
        defaultValue: genRandomString(4),
        validator: sessionIdValidator,
        description: "Session id to restore state from."
    })
    sessionId?: String

    @CmdArgument({
        required: false,
        standalone: false,
        pairOptions: sessionOptsWithRand,
        defaultValue: genRandomString(4),
        validator: sessionIdValidator,
        description: "Session id to restore state from."
    })
    s?: String
}

export class BaseServiceInteractMessages {
    @CmdArgument({
        required: false,
        description: "Echo message",
        standalone: false,
        defaultValue: "R U GAY?"
    })
    echo!: String
}

export class ServiceData<
TConfig extends BaseServiceConfig = BaseServiceConfig,
TParams extends BaseServiceParameters = BaseServiceParameters,
TMessages extends BaseServiceInteractMessages = BaseServiceInteractMessages
>
{
    constructor(
        public config: TConfig,
        public params: TParams,
        public messages: TMessages
    ) { }
}

/**
 * @description Parse every of BaseServiceParameters, BaseServiceConfig, BaseServiceInteractMessages.
 * All of parameters must start with duble dash: "--", algorithm conver all parameters to camelCase and remove all dashes.
 * So you must use in Base classes camelCase names and pass parameters with -- and separate word with -. e.g. "--session-id" to "sessionId" or '--BIG-SFD' to "bigSfd"
 */
//export function parseServiceData<T extends BaseDataStore>(args: string[], Store: new () => T): T {
//    const params = new Store()
//    const metadata = Reflect.getMetadata(SERVICE_METADATA_KEY, Store.prototype) as Record<keyof T, IArgMetadataOption>
//
//    let i = 0;
//    while (i < args.length) {
//        let arg = args[i]
//
//        if (arg.startsWith("--")) {
//            const key = camelCase(arg.slice(2)) as keyof T
//            const meta = metadata[key]
//
//            if (!meta) {
//                throw new Error(`Unknown argument: ${arg}`)
//            }
//
//            if (meta.standalone) {
//                // Boolean flag (e.g., --dry-run)
//                (params as any)[key] = true
//            } else {
//                // Argument with value (e.g., --session-id 123)
//                const value = args[i + 1]
//
//                if (!value || value.startsWith("--")) {
//                    throw new Error(`Missing value for argument: ${arg}`)
//                }
//
//                if (meta.validator && !meta.validator(value)) {
//                    throw new Error(`Invalid value for ${arg}: ${value}`)
//                }
//
//                (params as any)[key] = value
//                i++
//            }
//        }
//        i++
//    }
//
//    // Apply default values and check required fields
//    for (const key in metadata) {
//        const meta = metadata[key]
//
//        if ((params as any)[key] === undefined) {
//            if (meta.defaultValue !== undefined) {
//                (params as any)[key] = meta.defaultValue
//            } else if (meta.required) {
//                throw new Error(`Missing required parameter: --${key}`)
//            }
//        }
//    }
//
//    return params
//}
