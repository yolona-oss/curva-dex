"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WELCOME_TEXT = void 0;
const console_1 = require("@utils/console");
const bar = (fill = "#") => new Array(process.stdout.columns).fill(fill).join("");
exports.WELCOME_TEXT = `

${bar("^")}

${(0, console_1.inCenter)("Welcome to the cmd-deploy-hub", '-')}

${bar("v")}

`;
