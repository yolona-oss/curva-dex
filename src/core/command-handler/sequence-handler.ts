import { Stack } from '@utils/struct/stack'
import { WithNeighbors } from '@core/types/with-neighbors'
import { BuiltInSeqCommandsEnum } from './constants/built-in-cmd-enum'
import { ICmdHandlerResponce } from './types'

interface ISequenceType {
    target: string
    prev: Array<string>
    next: Array<string>
}

export class SequenceHandler {
    private sequences: Map<string, Stack<string>>
    private handlingSeq: Array<ISequenceType>

    constructor(
        data: Array<{target: string}&Partial<WithNeighbors>>
    ) {
        this.sequences = new Map()
        // TODO safty check
        this.handlingSeq = data.map(item => {
            const cur = {
                target: item.target,
                prev: item.prev ? [item.prev] : [],
                next: item.next || []
            }

            let iterPrev = data.find(itm => itm.target == item.prev)
            for (iterPrev; iterPrev; iterPrev = data.find(itm => itm.target == iterPrev?.prev)) {
                cur.prev.unshift(iterPrev.target)
            }

            cur.prev = cur.prev.filter((v, i, a) => a.indexOf(v) == i)
            return cur
        })
    }

    private handleBuiltInSeqCommands(command: string, selSequence: Stack<string>|undefined, seqId: string): ICmdHandlerResponce&{skip?: boolean} {
        switch (command) {
            case BuiltInSeqCommandsEnum.NEXT_COMMAND:
                // TODO handle next if command seq allow this and no arguments or defaults provided
                // skip
                break
            case BuiltInSeqCommandsEnum.BACK_COMMAND:
                if (selSequence) {
                    if (selSequence.size() > 0) {
                        const prevCmd = this.sequences.get(String(seqId))!.pop()
                        return {
                            success: true,
                            text: `You are backed to "${prevCmd}".`
                        }
                    }
                }
                return {
                    success: false,
                    text: "You are not in a command sequence."
                }
            case BuiltInSeqCommandsEnum.CANCEL_COMMAND:
                if (selSequence) {
                    this.sequences.get(String(seqId))!.drop()
                    return {
                        success: true,
                        text: "Sequence canceled."
                    }
                }
                return  {
                    success: false,
                    text: "You are not in a command sequence."
                }
            default:
                // skip
                break
        }

        return {
            success: true,
            skip: true
        }
    }

    private addToSeq(seqId: string, target: string): void {
        this.sequences.get(seqId)!.push(target)
    }

    private dropSeq(seqId: string): void {
        this.sequences.get(seqId)!.drop()
    }

    private includesInSeq(seqId: string, targets: string[]): string[] {
        //return targets.every((target) => this.sequences.get(seqId)!.includes(target))
        const notIncludes = []
        for (const target of targets) {
            if (!this.sequences.get(seqId)!.includes(target)) {
                notIncludes.push(target)
            }
        }
        return notIncludes
    }

    /**
    *  @returns void on skip
    */
    public handle(seqId: number|string, command: string): ICmdHandlerResponce|void {
        seqId = String(seqId)
        const selSequence = this.sequences.get(seqId)
        const handlingSeq = this.handlingSeq.find((item) => item.target === command)

        const res = this.handleBuiltInSeqCommands(command, selSequence, seqId)
        if (!res.skip) {
            const { text, success } = res
            return { text, success}
        }

        if (!selSequence) {
            this.sequences.set(seqId, new Stack())
        }

        if (!handlingSeq) {
            return {
                success: false,
                text: `Unknown command "${command}".`
            }
        }

        const curHandlingSeq = this.handlingSeq.find((item) => item.target === command)!

        // standalone
        if (curHandlingSeq.prev.length == 0 && curHandlingSeq.next.length == 0) {
            return
        }

        // check if all prev exececuted
        const notExecuted = this.includesInSeq(seqId, curHandlingSeq.prev)
        if (notExecuted.length == 0) {
            this.addToSeq(seqId, command)
        } else {
            return {
                success: false,
                text: `You are not executed all prev commands(${notExecuted.length}): ${notExecuted.join(', ')}.`
            }
        }

        // command is last in sequence
        if (curHandlingSeq.next.length === 0) {
            this.dropSeq(seqId)
            return
        }

        return
    }
}
