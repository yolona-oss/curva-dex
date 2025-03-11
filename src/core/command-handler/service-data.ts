import { genRandomString } from "@core/utils/random";

import { sessionIdValidator, sessionOptsWithRand } from "./utils/misc";

import 'reflect-metadata'
import { CmdArgument, CommandArgmuentKeyHolder, CommandArgumentMetadata, getCmdArgMetadata, getCmdArgUndefMetadata } from "@core/ui/types/command";

export function toDescriptor<T extends CommandArgmuentKeyHolder>(instance: T): CommandArgumentMetadata<keyof T> {
    return getCmdArgMetadata(instance)
}

export abstract class BaseCmdServiceConfig {
}

export class BaseCmdServiceParameters {
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

export class BaseCmdServiceInteractMessages {
    @CmdArgument({
        required: false,
        description: "Echo message",
        standalone: false,
        defaultValue: "R U GAY?"
    })
    echo!: String
}

export class CmdServiceData<
    TConfig extends BaseCmdServiceConfig = BaseCmdServiceConfig,
    TParams extends BaseCmdServiceParameters = BaseCmdServiceParameters,
    TMessages extends BaseCmdServiceInteractMessages = BaseCmdServiceInteractMessages
    >
{
    constructor(
        public config: TConfig,
        public params: TParams,
        public messages: TMessages
    ) { }
}
