import { checkers } from './common.js'
import { CheckerPlugin, PlugTypeEnum } from '@paragon/Types/Plugin.js'

const plugin: CheckerPlugin = {
    name: "Base chechers",
    type: PlugTypeEnum.Checker,
    checkers: checkers
}

export default plugin
