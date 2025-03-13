import { actions, StateSign } from './state.js'
import { commands } from './commands.js'

import { ExecutorPlugin, PlugTypeEnum } from '@paragon/Types/Plugin'

const plugin: ExecutorPlugin = {
    name: "Base commands",
    type: PlugTypeEnum.Executor,
    commands: commands,
    actions: actions,
    state: StateSign,
}

export default plugin
