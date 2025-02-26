"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequenceHandler = void 0;
const stack_1 = require("@utils/struct/stack");
const command_1 = require("@core/constants/command");
class SequenceHandler {
    sequences;
    handlingSeq;
    constructor(data) {
        this.sequences = new Map();
        this.handlingSeq = data.map(item => {
            const cur = {
                target: item.target,
                prev: item.prev ? [item.prev] : [],
                next: item.next || []
            };
            let iterPrev = data.find(itm => itm.target == item.prev);
            for (iterPrev; iterPrev; iterPrev = data.find(itm => itm.target == iterPrev?.prev)) {
                cur.prev.unshift(iterPrev.target);
            }
            cur.prev = cur.prev.filter((v, i, a) => a.indexOf(v) == i);
            return cur;
        });
    }
    handleDefaultSeqCommands(command, selSequence, seqId) {
        switch (command) {
            case command_1.DefaultSeqCommandsEnum.NEXT_COMMAND:
                break;
            case command_1.DefaultSeqCommandsEnum.BACK_COMMAND:
                if (selSequence) {
                    if (selSequence.size() > 0) {
                        const prevCmd = this.sequences.get(String(seqId)).pop();
                        return `You are backed to "${prevCmd}".`;
                    }
                }
                return "You are not in a command sequence.";
            case command_1.DefaultSeqCommandsEnum.CANCEL_COMMAND:
                if (selSequence) {
                    this.sequences.get(String(seqId)).drop();
                    return "Sequence canceled.";
                }
                return "You are not in a command sequence.";
            default:
                return;
        }
    }
    addToSeq(seqId, target) {
        this.sequences.get(seqId).push(target);
    }
    dropSeq(seqId) {
        this.sequences.get(seqId).drop();
    }
    includesInSeq(seqId, targets) {
        const notIncludes = [];
        for (const target of targets) {
            if (!this.sequences.get(seqId).includes(target)) {
                notIncludes.push(target);
            }
        }
        return notIncludes;
    }
    handle(seqId, command) {
        seqId = String(seqId);
        const selSequence = this.sequences.get(seqId);
        const handlingSeq = this.handlingSeq.find((item) => item.target === command);
        const answer = this.handleDefaultSeqCommands(command, selSequence, seqId);
        if (answer) {
            return answer;
        }
        if (!selSequence) {
            this.sequences.set(seqId, new stack_1.Stack());
        }
        if (!handlingSeq) {
            return;
        }
        const curHandlingSeq = this.handlingSeq.find((item) => item.target === command);
        if (curHandlingSeq.prev.length == 0 && curHandlingSeq.next.length == 0) {
            return;
        }
        const notExecuted = this.includesInSeq(seqId, curHandlingSeq.prev);
        if (notExecuted.length == 0) {
            this.addToSeq(seqId, command);
        }
        else {
            return `You are not executed all prev commands(${notExecuted.length}): ${notExecuted.join(', ')}.`;
        }
        if (curHandlingSeq.next.length === 0) {
            this.dropSeq(seqId);
            return;
        }
    }
}
exports.SequenceHandler = SequenceHandler;
