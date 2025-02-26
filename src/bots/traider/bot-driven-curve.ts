import log from '@utils/logger'

import path from 'path'

import { BLANK_INSTANCE_ID_PREFIX } from './impl/built-in'
import { ExCurve, ExCurveTradePoints } from "./curve";
import { loadFromJson, writeJsonData } from "@utils/fs";

const ex_curve_dir_name = "ex-curve"

export class BotDrivenCurve extends ExCurve {
    constructor(private owner: string, initial?: ExCurveTradePoints) {
        super(initial)
    }

    static loadFromFile(owner: string, curve_id: string): BotDrivenCurve {
        const data = loadFromJson<ExCurveTradePoints>(path.join(owner, ex_curve_dir_name), curve_id)

        if (data != null) {
            if (Array.isArray(data)) {
                try {
                    return new BotDrivenCurve(owner, data)
                } catch(e) {
                    log.error(`Error loading ex-curve from file: ${e}`)
                }
            }
        }

        log.warn("Curve file not found: " + curve_id, ". Creating new curve...")
        const instance = new BotDrivenCurve(owner)
        if (owner !== BLANK_INSTANCE_ID_PREFIX) {
            instance.saveToFile(curve_id)
        }
        return instance
    }

    saveToFile(curve_id: string) {
        if (curve_id.includes(BLANK_INSTANCE_ID_PREFIX)) {
            return
        }

        writeJsonData([this.owner, ex_curve_dir_name], curve_id, this.trades.map(t => ({
            ...t,
            price: t.price.toString(),
            quantity: t.quantity.toString()
        })))
    }
}
