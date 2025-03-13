import { BotDrivenCurve } from "@bots/traider";

(() => {
    const args = process.argv.slice(2)
    const owner = args[0]
    const curve_id = args[1]
    const curve = BotDrivenCurve.loadFromFile(owner, curve_id)
    //console.log(curve.toString())
    console.log(curve.consolePrintVertical())
})()
