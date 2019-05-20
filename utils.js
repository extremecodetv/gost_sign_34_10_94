const ab2str = (buf) => {
    return String.fromCharCode.apply(null, new Uint16Array(buf))
}

const str2ab = (str) => {
    var buf = new ArrayBuffer(str.length * 2)
    var bufView = new Uint16Array(buf)
    for (var i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i)
    }

    return buf
}

const byteToHexString = (uint8arr) => {
    if (!uint8arr) {
      return '';
    }
    
    var hexStr = '';
    for (var i = 0; i < uint8arr.length; i++) {
      var hex = (uint8arr[i] & 0xff).toString(16);
      hex = (hex.length === 1) ? '0' + hex : hex;
      hexStr += hex;
    }
    
    return hexStr.toUpperCase();
  }
  
const hexStringToByte = (str) => {
    if (!str) {
      return new Uint8Array();
    }
    
    var a = [];
    for (var i = 0, len = str.length; i < len; i+=2) {
      a.push(parseInt(str.substr(i,2),16));
    }
    
    return new Uint8Array(a);
}

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    ab2str,
    str2ab,
    byteToHexString,
    hexStringToByte,
    getRandomInt
}