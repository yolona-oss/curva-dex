import { SingleThrottler } from "@core/utils/single-throttler";

(async () => {
    SingleThrottler.Instance.SetThrottleDelay('test', 5000)
    console.log(`Throttle test. Throttle delay: ${SingleThrottler.Instance.ThrottleDelay('test')}`)
    while (true) {
        await SingleThrottler.Instance.throttle('test', async () => {
            console.log('test')
            console.log(new Date().toLocaleTimeString("ru"))
        })
    }
})()
