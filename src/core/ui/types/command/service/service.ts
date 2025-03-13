import { Account, Manager } from "@core/db";
import { IRunnable } from "@core/types/runnable";
import TypedEventEmitter, { EventMap } from 'typed-emitter'
import EventEmitter from 'events'

import { BLANK_SERVICE_NAME } from "./constants";
import { DEFAULT_ACCOUNT_SESSION_NAME } from "@core/db/schemes/account/session";

import {
    BaseCmdServiceConfig,
    BaseCmdServiceInteractMessages,
    BaseCmdServiceParameters,
    CmdServiceData,
    toDescriptor
} from "./data";

import { CmdArgumentMetadata } from "@core/ui/types/command";
import { Extender } from "@core/utils/extender";

import 'reflect-metadata';
import { UiUnicodeSymbols } from "@core/ui";

interface IBaseCmdService_EvMap<T = string> extends EventMap {
    message: (msg: T) => void,
    error: (err: string) => void,
    done: (msg?: string) => void,
    liveLog: (logs: string[]) => void
}

export class CommandServiceLoader {
    constructor() {
    }

    process() {
    }
}

export abstract class BaseCommandService<
        TSessionData,
        TConfig extends BaseCmdServiceConfig = BaseCmdServiceConfig,
        TParams extends BaseCmdServiceParameters = BaseCmdServiceParameters,
        TInteractMessages extends BaseCmdServiceInteractMessages = BaseCmdServiceInteractMessages
    >
    extends (EventEmitter as new () => TypedEventEmitter<IBaseCmdService_EvMap>)
    implements IRunnable
{
    private _isInited = false
    private _isRunning: boolean = false

    protected data: CmdServiceData<TConfig, TParams, TInteractMessages, TSessionData>

    constructor(
        protected userId: string,
        private defaultData: CmdServiceData<TConfig, TParams, TInteractMessages, TSessionData>,
        private inputServiceData: Partial<CmdServiceData<TConfig, TParams, TInteractMessages>>,
        public readonly name: string = BLANK_SERVICE_NAME,
    ) {
        super()
        this.data = Object.assign({}, defaultData)
    }

    protected abstract runWrapper(): Promise<void>
    protected abstract terminateWrapper(): Promise<void>
    abstract receiveMsg(msg: string, args: string[]): Promise<void>
    abstract clone(userId: string, input?: Partial<CmdServiceData>, newName?: string): BaseCommandService<TSessionData>

    sendMsg(msg: string) {
        this.emit("message", msg)
    }

    protected createServicePrefix() {
        return `${this.name}-${this.data.sessionId}-${this.userId}`
    }

    public get SessionId() {
        return this.data.sessionId
    }

    get isBlankSession() {
        return this.data.sessionId === DEFAULT_ACCOUNT_SESSION_NAME
    }

    isRunning(): boolean {
        return this._isRunning
    }

    configDescriptor(): CmdArgumentMetadata<keyof TConfig> {
        return toDescriptor(this.data.config)
    }

    paramsDescriptor(): CmdArgumentMetadata<keyof TParams> {
        return toDescriptor(this.data.params)
    }

    receiveMsgDescriptor(): CmdArgumentMetadata<keyof TInteractMessages> {
        return toDescriptor(this.data.messages)
    }

    toString() {
        return `${this.name}-${this.data.sessionId}`
    }

    async Initialize(): Promise<void> {
        if (this._isInited) {
            throw `${UiUnicodeSymbols.error} Service already initialized`
        }

        this._isInited = true

        try {
            this.initSession()
        } catch (e) {
            const msg = e instanceof Error ? e.message : e
            throw `${UiUnicodeSymbols.error} Service initialization error:\n-- ${msg}`
        }
    }

    private async retrieveAccountData() {
        const owner = (await Manager.findOne({userId: this.userId}))!;
        const account = (await Account.findById(owner.account))!;

        const sessionId = this.data.sessionId
        const {isNew, account_module} = await account.getModuleByNameOrCreate(this.name)
        const moduleAttachedSessions = await account_module.getSessions()
        let account_module_session = moduleAttachedSessions.find(s => s.name === sessionId)
        if (isNew || !account_module_session) {
            const new_session = await account_module.createAndApplySession({
                name: sessionId,
                expirity: Extender.stringToMs("1d"),
                incrementalExpirity: true
            })
            account_module_session = new_session
        }

        if (!account_module_session) {
            throw "Cannot handle account module session creation/assigning"
        }

        return {
            account,
            owner,
            account_module_session,
            account_module,
            session_data: account_module_session.data,
            module_data: account_module.data
        }
    }

    async initSession() {

        // load config and session data

        const inputData = this.inputServiceData
        const defaultData = this.defaultData

        const { account, owner, session_data, module_data, account_module_session, account_module } = await this.retrieveAccountData()
        
        let aConfig = module_data.config
        let aSessionData = session_data

        if (!aConfig) {
            aConfig = {
                ...defaultData.config,
                ...inputData.config
            }
            account_module.set("data.config", aConfig)
            await account_module.save()
        }

        if (!aSessionData) {
            aSessionData = {
                ...defaultData.sessionData,
                ...inputData.sessionData ?? {}
            }
            account_module_session.set("data", aSessionData)
            await account_module_session.save()
        }

        this.data = {
            config: aConfig,
            sessionData: aSessionData,
            sessionId: account_module_session.name,
            messages: defaultData.messages,
            params: defaultData.params,
        }
    }

    protected async setConfigValue(path: string, value: any) {
        const { account_module } = await this.retrieveAccountData()
        const prefix = `data.config${path.length > 0 ? "." : ""}`
        account_module.set(`${prefix}${path}`, value)
        await account_module.save()
    }

    protected async setSessionDataValue(path: string, value: any) {
        const { account_module_session } = await this.retrieveAccountData()
        const prefix = `data${path.length > 0 ? "." : ""}`
        account_module_session.set(`${prefix}${path}`, value)
        await account_module_session.save()
    }

    async run(): Promise<void> {
        if (!this._isInited) {
            throw `${UiUnicodeSymbols.error} Service not initialized`
        }
        if (this.isRunning()) {
            throw `${UiUnicodeSymbols.error} Service already running`
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
