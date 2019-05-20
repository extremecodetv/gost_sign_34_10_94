
const { sign, calcY } = require('./sign')
const { validate } = require('./validate')
const { getRandomInt } = require('./utils')
const BigInt = require('big-integer')


// initial
// a 1928
const q = 787
const b = 40

const calcA = () => {
    const g = getRandomInt(1, p - 1)
    const a = BigInt(g).pow(b).mod(p).toJSNumber()
    if (a > 1) {
        return a
    }

    return calcA()
}

const p = b * q + 1 // 31481
const a = calcA() 

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