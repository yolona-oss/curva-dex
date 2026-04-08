import { AppCmdhub } from '@core/cmdhub'
import { CmdDispatcher } from '@core/ui/command-processor'
import { TgContext, TelegramUI } from '@core/ui/impls/telegram'
import { getInitialConfig } from '@core/config'
import log from '@logger'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SocksProxyAgent } = require('socks-proxy-agent')
const { HttpsProxyAgent } = require('https-proxy-agent')

import { ImplRegistrySetup } from './impl-registry-setup'
import { InitializeUserCommands } from './user-commands'

function createProxyAgent() {
    const socksUrl = process.env.ALL_PROXY || process.env.all_proxy
        || process.env.SOCKS_PROXY || process.env.socks_proxy
    if (socksUrl) {
        log.info(`Using SOCKS proxy: ${socksUrl}`)
        return new SocksProxyAgent(socksUrl)
    }

    const httpsUrl = process.env.HTTPS_PROXY || process.env.https_proxy
        || process.env.HTTP_PROXY || process.env.http_proxy
    if (httpsUrl) {
        log.info(`Using HTTPS proxy: ${httpsUrl}`)
        return new HttpsProxyAgent(httpsUrl)
    }

    return undefined
}

type Ctx = TgContext

async function bootstrap() {
    ImplRegistrySetup()

    let handler = new CmdDispatcher<Ctx>()
    const cmds = InitializeUserCommands<Ctx>()
    handler.registerMany(cmds)
    handler.done()

    const cfg = getInitialConfig()
    const ui = new TelegramUI(cfg.bot.token, handler)

    const agent = createProxyAgent()
    if (agent) {
        ui.bot.telegram.options.agent = agent as any
    }

    const app = new AppCmdhub(ui)

    app.setErrorInterceptor(function(error: Error, origin) {
        console.log(`Origin: ${origin}`, origin)
        log.error(`Internal error: ${error}`)
    })
    await app.Initialize()

    //handler.debug()

    app.run()
}

bootstrap()
