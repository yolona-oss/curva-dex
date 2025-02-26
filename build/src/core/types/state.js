"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractCtx = exports.AbstractState = void 0;
class AbstractState {
    context;
    setContext(context) {
        this.context = context;
    }
}
exports.AbstractState = AbstractState;
class AbstractCtx {
    state;
    constructor(initialState) {
        this.transitionTo(initialState);
    }
    transitionTo(state) {
        this.state = state;
        this.state.setContext(this);
    }
}
exports.AbstractCtx = AbstractCtx;
