const BigInt = require('big-integer')
const hash = require('./hash')
const { str2ab, hexStringToByte, getRandomInt } = require('./utils')
const gost = new hash.Gost()

const makeHash = (buffer) => gost.hashArrayBuffer(buffer)

// secret 
const x = 3

const calcY = (a, p) => BigInt(a).pow(x).mod(p).toJSNumber()

const getR = (k, a, p, q) => {
    let temp1 = BigInt(a).pow(k)
    let temp2 = temp1.mod(p)
    let temp3 = temp2.mod(q).toJSNumber()

    return temp3
}

const getS = (k, h, r, q) => BigInt(k * h + x * r).mod(q).toJSNumber()

const signByte = (h, { a, p, q }) => {
    const k = getRandomInt(0, q)
    const r = getR(k, a, p, q)

    if (r === 0) {
        return signByte(h, { a, p, q })
    }

    const s = getS(k, h, r, q)
    if (s === 0) {
        return signByte(h, { a, p, q })
    }

    return { h, r, s }
}

// a kind of magic
const sign = (message, { a, p, q }) => {
    const messageBuffer = str2ab(message)
    const messageHash = makeHash(messageBuffer)
    
    const bytes = hexStringToByte(messageHash)
    const signed = []
    for (let i = 0; i < bytes.length; i += 1) {
        signed.push(signByte(bytes[i], { a, p, q }))
    }

    return {
        messageHash,
        sign: signed
    }
}

module.exports = {
    sign,
    calcY
}
