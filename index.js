
const { sign, calcY } = require('./sign')
const { validate } = require('./validate')

// initial
const q = 787
const p = 31481
const a = 1928

// public
const y = calcY(a, p)

const message = 'Hello World'
const signed = sign(message, { q, p, a })

console.log(`q = ${q}; p = ${p}; a = ${a};`)
console.log(`message = ${message};`)
console.log(`hashed message = ${signed.messageHash};`)

// console.table([signed.sign])
const isValid = validate(message, signed, { a, y, p, q })

console.log()