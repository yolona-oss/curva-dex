import { AppCmdhub } from '@core/cmdhub'
import { CHComposer } from '@core/command-handler'
import { TgContext } from '@core/ui/telegram'
import log from '@utils/logger'

import { ImplRegistrySetup } from './impl-registry-setup'
import { InitializeUserCommands } from './user-commands'

type Ctx = TgContext
const ui = 'telegram'

async function bootstrap() {
    ImplRegistrySetup()

    let handler = new CHComposer<Ctx>()
    const cmds = InitializeUserCommands<Ctx>()
    handler.registerMany(cmds)
    handler.done()

    const app = new AppCmdhub(ui, handler)

    app.setErrorInterceptor(function(error: Error, origin) {
        console.log(`Origin: ${origin}`, origin)
        log.error(`Internal error: ${error}`)
    })
    await app.Initialize()

    //handler.debug()

    app.run()
}

bootstrap()
