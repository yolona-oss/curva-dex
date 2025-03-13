export class CmdError {
    constructor(
        public ok: boolean = false,
        public readonly returnValue?: any,
        public readonly msg?: string
    ) {
    }

    Ok() {
        return this.ok
    }
}
