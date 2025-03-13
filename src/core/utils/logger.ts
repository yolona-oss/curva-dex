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

enum LogLevel {
    TRACE = 'TT',
    DEBUG = 'DD',
    INFO = 'II',
    WARN = 'WW',
    ERROR = 'EE',
}

function getInvokerDetails(): { fileName: string; functionName: string; lineNumber: string } {
    const error = new Error()
    const stack = error.stack?.split('\n') || []

    const callerLine = stack[4] || ''

    const match = callerLine.match(/at (.+) \((.+):(\d+):\d+\)/) || callerLine.match(/at (.+):(\d+):(\d+)/)

    if (match) {
        return {
            fileName: match[2] || 'unknown',
            functionName: match[1] || 'anonymous',
            lineNumber: match[3] || 'unknown',
        }
    }

    return {
        fileName: 'unknown',
        functionName: 'unknown',
        lineNumber: 'unknown',
    }
}

function formatMessage(level: LogLevel): string {
    const timestamp = logTime()
    const { fileName, functionName, lineNumber } = getInvokerDetails()

    let colored = level.toString()

    switch (level) {
        case LogLevel.TRACE:
            colored = chalk.cyan(colored)
            break
        case LogLevel.DEBUG:
            colored = chalk.blue(colored)
            break
        case LogLevel.INFO:
            colored = chalk.green(colored)
            break
        case LogLevel.WARN:
            colored = chalk.yellow(colored)
            break
        case LogLevel.ERROR:
            colored = chalk.red(colored)
            break
        default:
            break
    }

    let formattedMessage = `${timestamp}:[${chalk.bold(colored)}] [${chalk.bold(functionName)}:${chalk.bold(lineNumber)}] -> `

    return formattedMessage
}

type ExtendedLog = {
    (...arg: any[]): void,
    error: (...arg: any[]) => void
    warn: (...arg: any[]) => void
    info:  (...arg: any[]) => void
    debug: (...arg: any[]) => void
    trace: (...arg: any[]) => void
    lineSep: (symbol?: string) => void
}
let log = <ExtendedLog>function(...arg: any[]): void {
    try {
        appendFileSync(logFileName, logTime() + ' - ' + arg.join(" ") + "\n")
    } catch (e) {
        console.error(e)
    }
}

// TODO preserve multiline to output like:
// [time]:[II] => msga uga buga
//                resume buaa default   
//                fdsfas dasf asdf asdf asd f
// [time]:[II] => next log msg

log.error = function(...arg: any[]) {
    log("ERROR:", ...arg)
    console.error(formatMessage(LogLevel.ERROR), ...arg)
}

log.warn = function(...arg: any[]) {
    log("WARNING:", ...arg)
    console.warn(formatMessage(LogLevel.WARN), ...arg)
}

log.info = function(...arg: any[]) {
    log(...arg)
    console.log(formatMessage(LogLevel.INFO), ...arg)
}

log.debug = function(...arg: any[]) {
    log("DEBUG:", ...arg)
    console.log(formatMessage(LogLevel.DEBUG), ...arg)
}

log.trace = function(...arg: any[]) {
    log("TRACE:", ...arg)
    console.log(formatMessage(LogLevel.TRACE), ...arg)
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
