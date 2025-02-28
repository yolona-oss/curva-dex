import { AppCmdhub } from '@core/cmdhub'
import { CommandHandler } from '@core/command-handler'
import { TgContext } from '@core/ui/telegram'

import log from '@utils/logger'
import { ImplRegistrySetup } from './impl-registry-setup'

import { InitializeUserCommands } from './user-commands'
import { CLIContext } from '@core/ui/cli'

type Ctx = TgContext
const ui = 'telegram'
//type Ctx = CLIContext
//const ui = 'cli'

async function bootstrap() {
    ImplRegistrySetup()

    let handler = new CommandHandler<Ctx>()
    handler.registerMany(InitializeUserCommands<Ctx>())
    handler.done()

    const app = new AppCmdhub(ui, handler)

    app.setErrorInterceptor(function(error: Error) {
        log.error(`Internal error: ${error}`)
    })
    await app.Initialize()

    app.run()
}

bootstrap()
