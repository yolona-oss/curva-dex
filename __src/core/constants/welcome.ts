import { inCenter } from "@utils/console"

const bar = (fill: string = "#") => new Array(process.stdout.columns).fill(fill).join("")
export const WELCOME_TEXT = `

${bar("^")}
${bar("#")}

${inCenter("Welcome to the cmd-deploy-hub", '-')}

${bar("#")}
${bar("v")}

`
