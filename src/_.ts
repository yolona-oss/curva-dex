import { Chain, chainFallbackHandler, chainHandlerFactory } from '@core/utils/chain'

const chain = new Chain<number, string>()

chain.setFallThrowResponse('kitty4')
chain.use(chainHandlerFactory<number, string>((req) => {
    if (req === 1) {
        return 'kitty1'
    }
    return
}))

chain.useFirst(chainHandlerFactory<number, string>((req) => {
    if (req === 1) {
        return 'kitty2'
    }
    return
}))

chain.useFirst(chainHandlerFactory<number, string>((req) => {
    if (req === 1) {
        return 'kitty3'
    }
    return
}))

chain.use(chainFallbackHandler('kitty__4'))

console.log(chain.handle(3))
