import logger from '@logger';

import path from 'path'

import { BLANK_INSTANCE_ID_PREFIX } from './impl/built-in'
import { ExCurve, ExCurveTradePoints } from "./curve";
import { loadFromJson, writeJsonData } from "@utils/fs";

const ex_curve_dir_name = "ex-curve"

export class BotDrivenCurve extends ExCurve {
    constructor(public readonly curve_id: string, initial?: ExCurveTradePoints) {
        super(initial)
    }

    static loadFromFile(dir: string, curve_id: string): BotDrivenCurve {
        const data = loadFromJson<ExCurveTradePoints>(dir, curve_id)

        if (data != null) {
            if (Array.isArray(data)) {
                try {
                    return new BotDrivenCurve(curve_id, data)
                } catch(e) {
                    log.error(`Error loading ex-curve from file: ${e}`)
                }
            }
        }

        log.warn("Curve file not found: " + curve_id, ". Creating new curve...")
        const instance = new BotDrivenCurve(curve_id)
        instance.saveToFile(dir, curve_id)
        return instance
    }

    saveToFile(dir: string, curve_id: string) {
        if (curve_id.includes(BLANK_INSTANCE_ID_PREFIX)) {
            return
        }

        writeJsonData([dir], curve_id, this.toSave())
    }
}
