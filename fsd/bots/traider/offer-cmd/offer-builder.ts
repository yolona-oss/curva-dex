import { ICmdPushOffer_DeclineOpts, ICmdPushOffer_ExeOpts, ICmdPushOffer_SetupOpt } from './offer-cmd'
import { IBaseTradeAsset, IOffer, ITraider } from "./../types"
import { MAX_SLIPPAGE_DECIMAL } from "../constants"


export class CmdOfferBuilder<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> {
    private offer: Partial<IOffer<TradeAsset>> = {}
    private setup: Partial<ICmdPushOffer_SetupOpt> = {}
    private decline: Partial<ICmdPushOffer_DeclineOpts> = {}
    private exe: Partial<ICmdPushOffer_ExeOpts> = {}

    setTraider(traider: ITraider) {
        this.offer.traider = traider
        return this
    }

    setAsset(asset: TradeAsset) {
        this.offer.asset = asset
        return this
    }

    setMaxSpent(maxSpent: bigint) {
        this.offer.maxSpent = maxSpent
        return this
    }

    setSlippagePerc(slippagePerc: number) {
        if (slippagePerc < 0 || slippagePerc > MAX_SLIPPAGE_DECIMAL) {
            throw new Error("Slippage percentage must be between 0 and " + MAX_SLIPPAGE_DECIMAL)
        }
        this.offer.slippagePerc = slippagePerc
        return this
    }

    setFee(fee: any) {
        this.offer.fee = fee
        return this
    }

    setDeclineCond(declineCond: (trade: IOffer<TradeAsset>) => Promise<boolean>) {
        this.decline.declineCond = declineCond
        return this
    }

    setDeclineCascade(declineCascade: boolean) {
        this.decline.declineCascade = declineCascade
        return this
    }

    setRetries(retries: number) {
        this.exe.retries = retries
        return this
    }

    setTimeout(timeout: number) {
        this.exe.timeout = timeout
        return this
    }

    setDelay(delay: number) {
        this.exe.delay = delay
        return this
    }

    build() {
        if (!this.offer.traider) {
            throw new Error("Traider is not set")
        }
        if (!this.offer.asset) {
            throw new Error("Asset is not set")
        }
        if (!this.offer.maxSpent) {
            throw new Error("Max spent is not set")
        }
        return {
            offer: this.offer as IOffer<TradeAsset>,
            setup: this.setup as ICmdPushOffer_SetupOpt,
            decline: this.decline as ICmdPushOffer_DeclineOpts<TradeAsset>,
            exe: this.exe as ICmdPushOffer_ExeOpts
        }
    }
}
