import { PumpFunSlave, PumpFunMaster } from "@bots/traider/impl/pump.fun"
import { BaseWalletManager } from "@bots/traider"

type SlaveType = "holder" | "volatile" | "traider"

const slaveHolder_Signature = "_holder_"
const slaveVolatile_Signature = "_volatile_"
const slaveTraider_Signature = "_traider_"

export class SlaveDictionary {
    private master: PumpFunMaster

    constructor(master: PumpFunMaster) {
        this.master = master
    }
    
    get hodlers() {
        return this.master!.Slaves.filter(s => s.id.includes(slaveHolder_Signature))
    }

    get traiders() {
        return this.master!.Slaves.filter(s => s.id.includes(slaveTraider_Signature))
    }

    get volatile() {
        return this.master!.Slaves.filter(s => s.id.includes(slaveVolatile_Signature))
    }

    async create(count: number, type: SlaveType, wm: BaseWalletManager, clonable: PumpFunSlave) {
        const install_token = type === "traider" ?
            slaveTraider_Signature : type === "holder" ?
                slaveHolder_Signature : slaveVolatile_Signature
        const ret = []
        for (let i = 0; i < count; i++) {
            const wallet = await wm.createWallet()
            ret.push(
                this.master.createAndApplySlave(
                    clonable,
                    install_token,
                    wallet
                )
            )
        }
        return ret
    }
}
