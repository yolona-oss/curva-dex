import { Account, Manager } from "@core/db";
import { IRunnable } from "@core/types/runnable";
import { WithInit } from "@core/types/with-init";
import { EventEmitter, EventMap } from "@utils/EventEmitter";
import { assignToCustomPath, getInterfacePathsWithTypes, isEmpty } from "@utils/object";

interface bcs_em<T> extends EventMap {
    message: T,
    error: string,
    done: string,
    liveLog: string
}

export abstract class BaseCommandService<CfgType extends Object, MsgType = string> extends EventEmitter<bcs_em<MsgType>> implements IRunnable {
    private _isConfigInit: boolean = false
    private _isRunning: boolean = false
    protected session_id: string

    constructor(
        protected userId: string, // the user who execute this service
        protected config: CfgType,
        //public readonly parent: string = "",
        public readonly name: string = "common-cmd-hub-service",
    ) {
        super()
        this.session_id = this.createServicePrefix()+"_"+userId+"_"+new Date().toLocaleString('ru').replace(/:/g, "-")
    }

    protected createServicePrefix() {
        return `${this.name}-${this.userId}`
    }

    abstract parseInputParams(...args: string[]): string|void

    configEntries() {
        return getInterfacePathsWithTypes(this.config)
    }

    async initConfig(userId: string, reinit = false) {
        if (this._isConfigInit && !reinit) {
            return
        }
        this._isConfigInit = true

        const user = (await Manager.findOne({userId}))!;
        const account = (await Account.findById(user.account))!;

        const accountConfig = await account.getModuleData<CfgType>(this.name, "")
        if (accountConfig && !isEmpty(accountConfig)) {
            this.config = accountConfig
        } else {
            await account.setModuleData(this.name, "", this.config)
        }
    }

    abstract clone(userId: string, newName?: string): BaseCommandService<CfgType, MsgType>

    async setConfigValue(forUserId: number, path: string, value: any) {
        const user = (await Manager.findOne({userId: forUserId}))!;
        const account = (await Account.findById(user.account))!;

        account.setModuleData(this.name, path, value)
        this.config = assignToCustomPath(this.config, path, value)
    }

    isRunning(): boolean {
        return this._isRunning
    }

    async run(): Promise<void> {
        this._isRunning = true
    }

    async terminate(): Promise<void> {
        this._isRunning = false
        this.emit("done")
    }
}
