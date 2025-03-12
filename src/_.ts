import { genRandomNumber, genRandomNumberBetween } from "@core/utils/random";

const len = genRandomNumberBetween(1, 4)
const val = genRandomNumber(len)
console.log(`l: ${len} v: ${val}`)
