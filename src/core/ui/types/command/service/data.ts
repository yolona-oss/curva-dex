import { sessionIdValidator, sessionOptsWithRand } from "./utils/session-id-generator";

import { CmdArgument, CmdArgmuentKeyHolder, CmdArgumentMetadata, getCmdArgMetadata } from "@core/ui/types/command";
import { DEFAULT_ACCOUNT_SESSION_NAME } from "@core/db/schemes/account/session";

export function toDescriptor<T extends CmdArgmuentKeyHolder>(instance: T): CmdArgumentMetadata<keyof T> {
    return getCmdArgMetadata(instance)
}

export abstract class BaseCmdServiceConfig {
}

export class BaseCmdServiceParameters {
    @CmdArgument({
        required: false,
        pairOptions: sessionOptsWithRand,
        validator: sessionIdValidator,
        description: "Session id to restore state from."
    })
    sessionId?: string

    @CmdArgument({
        required: false,
        pairOptions: sessionOptsWithRand,
        validator: sessionIdValidator,
        description: "Session id to restore state from."
    })
    s?: string
}

export class BaseCmdServiceInteractMessages {
    @CmdArgument({
        required: false,
        description: "Echo message",
        defaultValue: "R U GAY?"
    })
    echo?: string
}

/**
 * sessionId will be setted to default or will be overwrited by params.sessionId. User input will be ignored if params.sessionId is set
 */
export class CmdServiceData<
        TConfig extends BaseCmdServiceConfig = BaseCmdServiceConfig,
        TParams extends BaseCmdServiceParameters = BaseCmdServiceParameters,
        TMessages extends BaseCmdServiceInteractMessages = BaseCmdServiceInteractMessages,
        TSessionData = {}
    >
{
    constructor(
        public config: TConfig,
        public params: TParams,
        public messages: TMessages,
        public readonly sessionId: string = DEFAULT_ACCOUNT_SESSION_NAME,
        public sessionData: TSessionData = {} as TSessionData
    ) {
        if (this.sessionId.trim() == "") {
            throw "Empty session id"
        }
        const paramSession = this.params.sessionId || this.params.s
        if (paramSession) {
            this.sessionId = paramSession
        }
    }
}
