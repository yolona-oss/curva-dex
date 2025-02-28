import { Account, Manager } from "@core/db";
import { IRunnable } from "@core/types/runnable";
import { InferParsedOpts, Opt, OptsMap, optsParser } from "@core/utils/opts-parser";
import { EventEmitter, EventMap } from "@utils/EventEmitter";
import { assignToCustomPath, getInterfacePathsWithTypes, isEmpty } from "@utils/object";

interface bcs_em<T = string> extends EventMap {
    message: T,
    error: string,
    done: string,
    liveLog: string
}

export const BLANK_SERVICE_NAME = "__blank_service_name__"
export const BLANK_SERVICE_SESSION_ID = "__blank_session_id__"
export const DEFAULT_INCREMENTAL_EXPIRITY_OPT = true
export const DEFAULT_SERVICE_SESSION_EXPIRITY = 1000 * 60 * 60 * 24 * 2 // 2 days

// TODO: create corn job for session expirity

export interface IDefaultServiceSessionData {
    createTime: number
    expirity: number // end on createTime+expirity
    initialExpirity: number // intial expirity that value will be added to expirity if incrementalExpirity is true
    incrementalExpirity: boolean // if true - every time when service run with new expirity
}

export const defaultServiceParamsMap: IDefaultServiceParams = {
    '--session-id': Opt.String,
    '-s': Opt.String
}

export interface IDefaultServiceParams extends OptsMap {
    '--session-id': String
    '-s': String
}

const NOT_ALLOWABLE_SESSION_NAMES = ['service']

// TODO: create opts validator and eval() injection finder

export abstract class BaseCommandService<
        CfgType extends Object = {},
        TServiceParams extends IDefaultServiceParams = IDefaultServiceParams,
        TServiceSessionData extends IDefaultServiceSessionData = IDefaultServiceSessionData
    >
        extends EventEmitter<bcs_em>
        implements IRunnable
{
    private _isInited = false
    private _isRunning: boolean = false

    protected abstract __serviceParamMap: TServiceParams // input param descriptor
    protected params: Partial<InferParsedOpts<TServiceParams>> = {} // real parsed params

    protected session_id: string
    protected session_data: Partial<TServiceSessionData> = {}

    constructor(
        protected userId: string, // the user who execute this service
        protected config: CfgType,
        protected params_string: string[],
        public readonly name: string = BLANK_SERVICE_NAME,
    ) {
        super()
        this.session_id = BLANK_SERVICE_SESSION_ID
    }

    protected abstract runWrapper(): Promise<void>
    protected abstract terminateWrapper(): Promise<void>
    abstract receiveMsg(msg: string, args: string[]): Promise<void>
    abstract clone(userId: string, inputParam: string[], newName?: string): BaseCommandService<CfgType, TServiceParams, TServiceSessionData>

    sendMsg(msg: string) {
        this.emit("message", msg)
    }

    protected createServicePrefix() {
        return `${this.name}-${this.session_id}-${this.userId}`
    }

    configEntries() {
        return getInterfacePathsWithTypes(this.config)
    }

    paramsEntries() {
        return getInterfacePathsWithTypes(this.__serviceParamMap)
    }

    async Initialize(): Promise<void> {
        if (this._isInited) {
            throw "Service already initialized"
        }

        this._isInited = true

        try {
            this.initServiceParam()
            this.initSession()
        } catch (e) {
            const msg = e instanceof Error ? e.message : e
            throw `Service initialization error: ${msg}`
        }
    }

    private initServiceParam() {
        this.params = optsParser(this.params_string, this.__serviceParamMap)
    }

    async initSession(skipSessionLoad = false) {
        const parseSession_id = () => {
            const sessionParam = this.params['--session-id'] || this.params['-s']
            if (sessionParam) {
                const session_id = String(sessionParam)
                // allow only letters and numbers
                if (session_id.match(/^[a-zA-Z0-9]+$/) && !NOT_ALLOWABLE_SESSION_NAMES.includes(session_id)) {
                    return session_id
                }
            }
            return
        }
        const session_id = parseSession_id()
        if (session_id && !skipSessionLoad) {
            this.session_id = session_id
        } else {
            this.session_id = BLANK_SERVICE_SESSION_ID
        }

        // load config and session data

        const module_name = this.session_id === BLANK_SERVICE_SESSION_ID ? this.name : `${this.name}_${this.session_id}`
        const module_session_name = `${module_name}_session`

        const user = (await Manager.findOne({userId: this.userId}))!;
        const account = (await Account.findById(user.account))!;

        const accountConfig = await account.getModuleData<CfgType>(module_name)
        const accountSessionData = await account.getModuleData<TServiceSessionData>(module_session_name)
        if (accountConfig && !isEmpty(accountConfig)) {
            this.config = accountConfig
        } else {
            await account.setModuleData(module_name, "", this.config)
        }

        if (accountSessionData && !isEmpty(accountSessionData)) {
            this.session_data = accountSessionData
            if (this.session_data.createTime && this.session_data.expirity) {
                if (Date.now() > this.session_data.createTime + this.session_data.expirity) {
                    await account.unsetModuleData(module_name)
                    await account.unsetModuleData(module_session_name)
                    await this.initSession(true) // create new blank session
                } else if (this.session_data.incrementalExpirity && this.session_data.initialExpirity) {
                    // incremental expirity
                    // TODO do not change expirity every time :))) but how?
                    this.session_data.expirity += this.session_data.initialExpirity
                    await account.setModuleData(module_session_name, "expirity", this.session_data.expirity)
                }
            }
        } else {
            const sessionData = {
                createTime: Date.now(),
                expirity: DEFAULT_SERVICE_SESSION_EXPIRITY,
                initialExpirity: DEFAULT_SERVICE_SESSION_EXPIRITY,
                incrementalExpirity: DEFAULT_INCREMENTAL_EXPIRITY_OPT,
            }
            await account.setModuleData(module_session_name, "", sessionData)
            this.session_data = sessionData as TServiceSessionData
        }
    }

    protected async setConfigValue(forUserId: number, path: string, value: any) {
        const module_name = `${this.name}_${this.session_id}`

        const user = (await Manager.findOne({userId: forUserId}))!;
        const account = (await Account.findById(user.account))!;

        account.setModuleData(module_name, path, value)
        this.config = assignToCustomPath(this.config, path, value)
    }

    isBlankSession() {
        return this.session_id === BLANK_SERVICE_SESSION_ID
    }

    isRunning(): boolean {
        return this._isRunning
    }

    async run(): Promise<void> {
        if (!this._isInited) {
            throw "Service not initialized"
        }
        if (this.isRunning()) {
            throw `Service already running`
        }

        this._isRunning = true

        await this.runWrapper()
    }

    async terminate(): Promise<void> {
        await this.terminateWrapper()
        this._isRunning = false
        this.emit("done")
    }
}
