import { AbstractTTickerCtx, BaseTTickerState, TTicker } from "@bots/traider";

export class DummyState extends BaseTTickerState {

}

export class PFTickerCtx extends AbstractTTickerCtx {
    constructor() {
        super(new DummyState)
    }

    async tick() {
    }

    async exit() {

    }
}

export class PFTicker extends TTicker {

}
