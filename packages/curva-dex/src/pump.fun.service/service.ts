import { BaseCommandService } from "@core/ui/types";

import { PumpFunRobot } from "./robot";
import { IPumpFunRobotConfig } from "./config";
import { BLANK_USER_ID } from "@core/ui/command-processor";
import {
    pfDefaultData,
    pfname,
    PFServiceDataType
} from "./service-data";

export class PumpFunService extends BaseCommandService<PFServiceDataType> {

    private robot?: PumpFunRobot

    constructor(
        userId: string = BLANK_USER_ID,
        inputData: Partial<PFServiceDataType> = {},
        name: string = pfname
    ) {
        super(
            userId,
            pfDefaultData,
            inputData,
            name,
        )
    }

    clone(userId: string, inputData: Partial<PFServiceDataType> = {}, newName: string = pfname) {
        return new PumpFunService(userId, inputData, newName)
    }

    async receiveMsg(msg: string, __: string[]): Promise<void> {
        if (!this.robot) {
            this.emit("message", "Not initialized")
            return
        }
        try {
            switch (msg) {
                case 'pause':
                    await this.robot.pause()
                    this.emit("message", "Paused")
                    break
                case 'resume':
                    await this.robot.resume()
                    this.emit("message", "Resumed")
                    break
                case 'stop':
                    await this.robot.stop()
                    this.emit("message", "Stopped")
                    break
                case 'sell-all':
                    await this.robot.sellAll()
                    this.emit("message", "All assets sold")
                    break
            }
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : e
            this.emit("message", msg)
        }
    }

    protected async runWrapper() {
        const master_state_save = this.data.sessionData.master_state_save
        const dryRun = this.data.params.dryRun ? true : false
        this.robot = new PumpFunRobot(
            this.createServicePrefix(),
            this.data.config.targetAsset,
            this.data.config as unknown as IPumpFunRobotConfig,
            this.isBlankSession ? null : master_state_save,
            dryRun
        )

        await this.robot.Initialize()
        await this.robot.start()
    }

    async terminateWrapper() {
        if (!this.robot) {
            this.emit("message", "Not initialized")
            return
        }
        await this.robot.stop()
        const session_data = this.robot.toSave()
        await this.setSessionDataValue('master_state_save', session_data.master)
        await this.setSessionDataValue('state', session_data.state)
    }

}
