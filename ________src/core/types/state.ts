export abstract class AbstractState<Ctx> {
    protected context!: Ctx

    public setContext(context: Ctx) {
        this.context = context
    }
}

export abstract class AbstractCtx<StateType extends AbstractState<any>> {
    protected _ctx_state!: StateType

    constructor(initialState: StateType) {
        this.transitionTo(initialState)
    }

    public transitionTo(state: StateType) {
        this._ctx_state = state
        this._ctx_state.setContext(this)
    }
}
