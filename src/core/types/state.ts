export abstract class AbstractState<Ctx> {
    // @ts-ignore
    protected context: Ctx

    public setContext(context: Ctx) {
        this.context = context
    }
}

export abstract class AbstractCtx<StateType extends AbstractState<any>> {
    // @ts-ignore
    protected state: StateType

    constructor(initialState: StateType) {
        this.transitionTo(initialState)
    }

    public transitionTo(state: StateType) {
        this.state = state
        this.state.setContext(this)
    }
}
