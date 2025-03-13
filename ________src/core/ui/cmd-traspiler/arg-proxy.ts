import { IArgumentCompiled } from "../types";

export class ArgProxy {
    constructor(
        private readonly read: IArgumentCompiled[]
    ) { }

}
