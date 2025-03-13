import { appendFileSync } from 'fs'
import chalk from 'chalk'
import { ColorName } from 'chalk'
import { createDirIfNotExist } from '@core/utils/fs-tools'
import path from 'path'
import { Config } from './config'

function logTime() {
    return new Date().toLocaleString("ru").replace(', ', ' ')
}

enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
}

function logLevelToColor(level: LogLevel) {
    switch (level) {
        case LogLevel.TRACE:
            return chalk.cyan
        case LogLevel.DEBUG:
            return chalk.blue
        case LogLevel.INFO:
            return chalk.green
        case LogLevel.WARN:
            return chalk.yellow
        case LogLevel.ERROR:
            return chalk.red
        default:
            return chalk.white
    }
}

function logLevelToSymbol(level: LogLevel) {
    switch (level) {
        case LogLevel.TRACE:
            return 'II'
        case LogLevel.DEBUG:
            return 'DD'
        case LogLevel.INFO:
            return 'II'
        case LogLevel.WARN:
            return 'WW'
        case LogLevel.ERROR:
            return 'EE'
        default:
            return '??'
    }
}

function stringToLogLevel(str: string) {
    switch (str.toLowerCase()) {
        case 'trace':
            return LogLevel.TRACE
        case 'debug':
            return LogLevel.DEBUG
        case 'info':
            return LogLevel.INFO
        case 'warn':
            return LogLevel.WARN
        case 'error':
            return LogLevel.ERROR
        default:
            log.warn(`Unknown log level: ${str}`)
            return LogLevel.TRACE
    }
    //throw new Error(`Unknown log level: ${str}`)
}

// TODO preserve multiline to output like:
// [time]:[II] => msga uga buga
//                resume buaa default   
//                fdsfas dasf asdf asdf asd f
// [time]:[II] => next log msg

export class log {
    private static instance?: log

    private static log_file: string

    private static cur_level: LogLevel = LogLevel.TRACE

    private constructor() {
        log.cur_level = stringToLogLevel(Config.Instance.getInitialConfig().log_level)
    }

    static get Instance(): log {
        if (!log.instance) {
            const curDate = new Date().toLocaleDateString("ru")
            const curTime = new Date().toLocaleTimeString("ru")

            this.log_file = path.join(".", '.log', `${curDate}_${curTime}`)
            createDirIfNotExist(".log")
            log.instance = new log();
        }
        return log.instance;
    }

    private log_to_file(...arg: any[]) {
        try {
            appendFileSync(log.log_file, logTime() + ' - ' + arg.join(" ") + "\n")
        } catch (e) {
            console.error(e)
        }
    }

    private prefix(level: LogLevel) {
        const time = logTime()
        const mark = logLevelToColor(level)(level)

        return `[${time}]:[${mark}] ->`
    }

    private log_filter(level: LogLevel, ...arg: any[]) {
        this.log_to_file(...arg)

        if (level >= log.cur_level) {
            console.log(this.prefix(level), ...arg)
        }
    }

    static error(...arg: any[]) { log.Instance.log_filter(LogLevel.ERROR, ...arg) }
    static warn (...arg: any[]) { log.Instance.log_filter(LogLevel.WARN,  ...arg) }
    static info (...arg: any[]) { log.Instance.log_filter(LogLevel.INFO,  ...arg) }
    static debug(...arg: any[]) { log.Instance.log_filter(LogLevel.DEBUG, ...arg) }
    static trace(...arg: any[]) { log.Instance.log_filter(LogLevel.TRACE, ...arg) }

    lineSep(symbol: string = '~', color: ColorName = 'white') {
        const cols = process.stdout.columns
        console.log(
            chalk.bold(
                chalk[color]((symbol.slice(0, 1)).repeat(cols))
            )
        )
    }
}

// initial creation
log.Instance
export default log
