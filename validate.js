const BigInt = require('big-integer')
const hash = require('./hash')
const { str2ab, hexStringToByte } = require('./utils')
const gost = new hash.Gost()

const makeHash = (buffer) => gost.hashArrayBuffer(buffer)

const gcd = (a, b) => {
    let u = [a, 1, 0]
    let v = [b, 0, 1]
    
    let q, t
    while (v[0] != 0) {
        q = (u[0] / v[0]) >> 0
        t = [u[0] % v[0], u[1] - q * v[1], u[2] - q * v[2]]
        u = v
        v = t
    }

    return u
}

const inversion = (m, c) => {
    const d = gcd(c, m)[1]
    if (d < 0) {
        return d + m
    }

    return d
}

// inversion(7, 29)

const validateByte = (h, r, s, { a, y, p, q }) => {
    if (!(0 < r && s < q)) {
        return false
    }

    const inverted = inversion(h, q)
    const u1 = (s * inverted) % q
    const u2 = Math.abs((-r * inverted) % q)

    const temp1 = BigInt(a).pow(u1)
    const temp2 = BigInt(y).pow(u2)
    const temp3 = temp1.multiply(temp2)

    const v = temp3.mod(p).mod(q).toJSNumber()
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