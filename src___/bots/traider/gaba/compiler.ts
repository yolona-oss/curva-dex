import { IRunnable } from "@core/types/runnable";
import * as Paragon from '@paragon/index'

class GabaScriptReader {
    constructor() {
    }

    public seek() {

    }

    public read() {

    }
}

// Script example:
// ::Start
//
// [all]curve::on([up]trend, [time]10s) -> [traiders]bots::buy([mark::traider]slaves, );
//
// ::End
export class GabaCompier {
    private reader: GabaScriptReader

    constructor(private script: string) {
        this.reader = new GabaScriptReader()
    }

    private readline() {

    }

    public compile() {

    }
}
