/**
 * From up to down order 
 *          |
 *          V
 *
 * 1. inited - input parsed and config loaded
 * 2. distribute - all slaves distributed
 * 3. initial_buy - all initial buys done
 * 4. ready - all preparing ops done and 
 * 5. run - main loop
 * 6. end - nothing to do
 *
 * ...
 *
 * pause - pause the robot
 */
export type IPumpFunRobotSessionState = "ready" | "inited" | "distribute" | "initial_buy" | "end" | "run" | "pause"

export const stateTransiteMap: Record<IPumpFunRobotSessionState, IPumpFunRobotSessionState[]> = {
    'inited': ['distribute', 'end'],
    'distribute': ['initial_buy', 'end'],
    'initial_buy': ['run', 'end'],
    'ready': ['run', 'end'],
    'run': ['pause', 'end'],
    'end': ['inited'],
    'pause': ['run', 'end'],
}
