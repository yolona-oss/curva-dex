import { appendFileSync } from 'fs'
import chalk from 'chalk'
import { createDirIfNotExist } from './fs-tools'

function logTime() {
    return '[' + new Date().toLocaleString("ru").replace(', ', ' ') + ']'
}

createDirIfNotExist("./.log")

const logFileName = "./.log/" +
    new Date()
        .toLocaleDateString("ru") +
    "_" +
    new Date()
        .toLocaleTimeString("ru")

type ExtendedLog = {
    (...arg: any[]): void,
    echo:  (...arg: any[]) => void
    error: (...arg: any[]) => void
    warn: (...arg: any[]) => void
    lineSep: (symbol?: string) => void
}
let log = <ExtendedLog>function(...arg: any[]): void {
    try {
        appendFileSync(logFileName, logTime() + ' - ' + arg.join(" ") + "\n")
    } catch (e) {
        console.error(e)
    }
}

log.error = function(...arg: any[]) {
    log("ERROR:", ...arg)

    console.error(logTime() + ':' + '[' + chalk.red('EE') + '] ->', ...arg)
}

log.warn = function(...arg: any[]) {
    log("WARNING:", ...arg)
    console.warn(logTime() + ':' + '[' + chalk.yellow('WW') + '] ->', ...arg)
}

log.echo = function(...arg: any[]) {
    log(...arg)
    console.log(logTime() + ':' + '[' + chalk.blue('II') + '] ->', ...arg)
}

log.lineSep = function(symbol: string = '~', color: string = "cyan") {
    const cols = process.stdout.columns
    let color_fn = chalk.cyan
    switch (color) {
        case "red":
            color_fn = chalk.red
            break
        case "yellow":
            color_fn = chalk.yellow
            break
        case "green":
            color_fn = chalk.green
            break
        case "cyan":
            color_fn = chalk.cyan
            break
        default:
            color_fn = chalk.cyan
            break
    }
    console.log(
        chalk.bold(
            color_fn((symbol.slice(0, 1)).repeat(cols))
        )
    )
}

export default log
