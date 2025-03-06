// TODO: create corn job for session expirity
//       create opts validator and eval() injection finder

import { Account, Manager } from "@core/db";
import { IRunnable } from "@core/types/runnable";
import TypedEventEmitter, { EventMap } from 'typed-emitter'
import EventEmitter from 'events'
import { assignToCustomPath, isEmpty } from "@utils/object";
import {
    BLANK_SERVICE_NAME,
    CreateDefaultServiceSessionData,
    BLANK_SERVICE_SESSION_ID,
    MODULE_SESSION_ID_MARK,
} from "./constants";

import 'reflect-metadata';
import { BaseServiceConfig, BaseServiceInteractMessages, BaseServiceParameters, ServiceData, toDescriptor } from "./service-data";
import { IServiceSessionData } from "./types";
import { CommandArgumentMetadata } from "@core/ui/types/command";

interface IBaseCmdService_EvMap<T = string> extends EventMap {
    message: (msg: T) => void,
    error: (err: string) => void,
    done: (msg?: string) => void,
    liveLog: (logs: string[]) => void
}

export abstract class BaseCommandService<
        TSessionData extends IServiceSessionData,
        TConfig extends BaseServiceConfig = BaseServiceConfig,
        TParams extends BaseServiceParameters = BaseServiceParameters,
        TInteractMessages extends BaseServiceInteractMessages = BaseServiceInteractMessages
    >
    extends (EventEmitter as new () => TypedEventEmitter<IBaseCmdService_EvMap>)
    implements IRunnable
{
    private _isInited = false
    private _isRunning: boolean = false

    protected data: ServiceData<TConfig, TParams, TInteractMessages>

    protected session_data: Partial<TSessionData> & IServiceSessionData

    constructor(
        protected userId: string, // the user who execute this service
        serviceData: ServiceData<TConfig, TParams, TInteractMessages>,
        public readonly name: string = BLANK_SERVICE_NAME,
    ) {
        super()
        this.data = serviceData
        // TODO: VVVVVVVVVVVVVVVVVVVVVVVVVV HOW TO FIX? VVVVVVVVVVVVVVVVVV
        this.session_data = CreateDefaultServiceSessionData() as (Partial<TSessionData> & IServiceSessionData)
    }

    protected abstract runWrapper(): Promise<void>
    protected abstract terminateWrapper(): Promise<void>
    abstract receiveMsg(msg: string, args: string[]): Promise<void>
    abstract clone(userId: string, serviceData?: ServiceData, newName?: string): BaseCommandService<TSessionData>

    sendMsg(msg: string) {
        this.emit("message", msg)
    }

    protected createServicePrefix() {
        return `${this.name}-${this.data.params.sessionId}-${this.userId}`
    }

    configDescriptor(): CommandArgumentMetadata<keyof TConfig> {
        return toDescriptor(this.data.config)
    }

    paramsDescriptor(): CommandArgumentMetadata<keyof TParams> {
        return toDescriptor(this.data.params)
    }

    receiveMsgDescriptor(): CommandArgumentMetadata<keyof TInteractMessages> {
        return toDescriptor(this.data.messages)
    }

    toString() {
        return `${this.name}`
    }

    protected get SessionIdAsModuleName() {
        return MODULE_SESSION_ID_MARK + this.SessionId
    }

    protected get SessionId() {
        return this.data.params.sessionId || this.data.params.s || BLANK_SERVICE_SESSION_ID
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
        //this.params = parseServiceParams(this.params_string, this.__serviceParamMap)
    }

    async initSession() {
        // load config and session data

        const user = (await Manager.findOne({userId: this.userId}))!;
        const account = (await Account.findById(user.account))!;

        const module_name = account.extendModuleName(this.name, [ this.SessionIdAsModuleName ])
        const module_session_name = account.extendModuleName(this.name, [this.SessionIdAsModuleName, "session_store"])

        const accountConfig = await account.getModuleData<typeof this.data.config>(module_name)
        const accountSessionData = await account.getModuleData<TSessionData>(module_session_name)
        if (accountConfig && !isEmpty(accountConfig)) {
            this.data.config = accountConfig
        } else {
            await account.setModuleData(module_name, "", this.data.config)
        }

        if (accountSessionData && !isEmpty(accountSessionData)) {
            this.session_data = accountSessionData
            if (this.session_data.createTime && this.session_data.expirity) {
                if (Date.now() > this.session_data.createTime + this.session_data.expirity) {
                    await account.unsetModuleData(module_name)
                    await account.unsetModuleData(module_session_name)
                    console.log("blank session due session expirity passed")

                    this.data.params.sessionId = BLANK_SERVICE_SESSION_ID
                    this.data.params.s = BLANK_SERVICE_SESSION_ID

                    await this.initSession() // create new blank session
                } else if (this.session_data.incrementalExpirity && this.session_data.initialExpirity) {
                    // incremental expirity
                    // TODO do not change expirity every time :))) but how?
                    this.session_data.expirity += this.session_data.initialExpirity
                    await account.setModuleData(module_session_name, "expirity", this.session_data.expirity)
                }
            }
        } else {
            const sessionData = CreateDefaultServiceSessionData()
            await account.setModuleData(module_session_name, "", sessionData)
            this.session_data = sessionData as (Partial<TSessionData> & IServiceSessionData)
        }
    }

    protected async setConfigValue(path: string, value: any) {
        const user = (await Manager.findOne({userId: this.userId}))!;
        const account = (await Account.findById(user.account))!;

        const module_name = account.extendModuleName(this.name, [ this.SessionIdAsModuleName ])

        account.setModuleData(module_name, path as string, value)
        this.data.config = assignToCustomPath(this.data.config, path as string, value)
    }

    protected async setSessionDataValue(path: string, value: any) {
        const user = (await Manager.findOne({userId: this.userId}))!;
        const account = (await Account.findById(user.account))!;

        const module_name = account.extendModuleName(this.name, [ this.SessionIdAsModuleName ])

        account.setModuleData(module_name, path as string, value)
        this.session_data = assignToCustomPath(this.session_data, path as string, value)
    }

    isBlankSession() {
        return this.SessionId === BLANK_SERVICE_SESSION_ID
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
