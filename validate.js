const BigInt = require('big-integer')
const hash = require('./hash')
const { str2ab, hexStringToByte } = require('./utils')
const gost = new hash.Gost()

const makeHash = (buffer) => gost.hashArrayBuffer(buffer)

const validateByte = (h, r, s, { a, y, p, q }) => {
    if (!(0 < r && s < q)) {
        return false
    }

    const u1 = (s * Math.pow(h, -1)) % q //
    const u2 = (-1 * r * Math.pow(h, -1)) % q //

    const v = (Math.pow(a, u1) * Math.pow(y, u2) % p) % q
    return v === r
}

const validate = (message, signed, { a, y, p, q }) => {
    const buffer = str2ab(message)
    const hash = makeHash(buffer)
    const bytes = hexStringToByte(signed.messageHash)
    const { sign } = signed

    let valid = true
    for (let i = 0; i < bytes.length; i += 1) {
        const { r, s } = sign[i]
        valid = valid && validateByte(bytes[i], r, s, { a, y, p, q })
    }

    return valid
}

module.exports = {
    validate
}