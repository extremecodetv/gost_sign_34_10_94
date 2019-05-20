var Gost = (function () {
	function Gost(isCryptoPro) {
		this.hash = new Array(8);
		this.sum = new Array(8);
		this.message = new Array(32);
		this.length = 0;
		this.r = 0;
		this.l = 0;
		this.gost_sbox = new Array(4);
		this.Utf8 = {
			encode: function (strUni) {
				var strUtf = strUni.replace(/[\u0080-\u07ff]/g, // U+0080 - U+07FF => 2 bytes 110yyyyy, 10zzzzzz
				function (c) {
					var cc = c.charCodeAt(0);
					return String.fromCharCode(0xc0 | cc >> 6, 0x80 | cc & 0x3f);
				});
				strUtf = strUtf.replace(/[\u0800-\uffff]/g, // U+0800 - U+FFFF => 3 bytes 1110xxxx, 10yyyyyy, 10zzzzzz
				function (c) {
					var cc = c.charCodeAt(0);
					return String.fromCharCode(0xe0 | cc >> 12, 0x80 | cc >> 6 & 0x3F, 0x80 | cc & 0x3f);
				});
				return strUtf;
			},
			decode: function (strUtf) {
				var strUni = strUtf.replace(/[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g, // 3-byte chars
				function (c) {
					var cc = ((c.charCodeAt(0) & 0x0f) << 12) | ((c.charCodeAt(1) & 0x3f) << 6) | (c.charCodeAt(2) & 0x3f);
					return String.fromCharCode(cc);
				});
				strUni = strUni.replace(/[\u00c0-\u00df][\u0080-\u00bf]/g, // 2-byte chars
				function (c) {
					var cc = (c.charCodeAt(0) & 0x1f) << 6 | c.charCodeAt(1) & 0x3f;
					return String.fromCharCode(cc);
				});
				return strUni;
			}
		};
		this.sbox = [];
		this.sbox_standard = [
			[4, 10, 9, 2, 13, 8, 0, 14, 6, 11, 1, 12, 7, 15, 5, 3],
			[14, 11, 4, 12, 6, 13, 15, 10, 2, 3, 8, 1, 0, 7, 5, 9],
			[5, 8, 1, 13, 10, 3, 4, 2, 14, 15, 12, 7, 6, 0, 9, 11],
			[7, 13, 10, 1, 0, 8, 9, 15, 14, 4, 6, 12, 11, 2, 5, 3],
			[6, 12, 7, 1, 5, 15, 13, 8, 4, 10, 9, 14, 0, 3, 11, 2],
			[4, 11, 10, 0, 7, 2, 1, 13, 3, 6, 8, 5, 9, 12, 15, 14],
			[13, 11, 4, 1, 3, 15, 5, 9, 0, 10, 14, 7, 6, 8, 2, 12],
			[1, 15, 13, 0, 5, 7, 10, 4, 9, 2, 3, 14, 6, 11, 8, 12]
		];
		this.sbox_crypto_pro = [
			[10, 4, 5, 6, 8, 1, 3, 7, 13, 12, 14, 0, 9, 2, 11, 15],
			[5, 15, 4, 0, 2, 13, 11, 9, 1, 7, 6, 3, 12, 14, 10, 8],
			[7, 15, 12, 14, 9, 4, 1, 0, 3, 11, 5, 2, 6, 10, 8, 13],
			[4, 10, 7, 12, 0, 15, 2, 8, 14, 1, 6, 5, 13, 11, 9, 3],
			[7, 6, 4, 11, 9, 12, 2, 10, 1, 8, 0, 14, 15, 13, 3, 5],
			[7, 6, 2, 4, 13, 9, 15, 0, 10, 1, 5, 11, 8, 14, 12, 3],
			[13, 14, 4, 1, 7, 0, 5, 10, 3, 12, 8, 15, 6, 2, 9, 11],
			[1, 3, 10, 9, 5, 11, 4, 15, 8, 6, 7, 14, 13, 0, 2, 12]
		];
		if (isCryptoPro) {
			this.sbox = this.sbox_crypto_pro;
		}
		else {
			this.sbox = this.sbox_standard;
		}
		for (var j = 0; j < 4; j++)
			this.gost_sbox[j] = new Array(256);
		this.gost_init();
		this.gost_init_table();
	}
	Gost.prototype.gost_init = function () {
		for (var i = 0; i < 8; i++) {
			this.hash[i] = 0;
			this.sum[i] = 0;
			this.message[4 * i] = 0;
			this.message[4 * i + 1] = 0;
			this.message[4 * i + 2] = 0;
			this.message[4 * i + 3] = 0;
		}
		length = 0;
	};
	Gost.prototype.gost_init_table = function () {
		var ax, bx, cx, dx;
		for (var i = 0, a = 0; a < 16; a++) {
			ax = this.sbox[1][a] << 15;
			bx = this.sbox[3][a] << 23;
			cx = Gost.rol(this.sbox[5][a], 31);
			dx = this.sbox[7][a] << 7;
			for (var b = 0; b < 16; b++, i++) {
				this.gost_sbox[0][i] = ax | (this.sbox[0][b] << 11);
				this.gost_sbox[1][i] = bx | (this.sbox[2][b] << 19);
				this.gost_sbox[2][i] = cx | (this.sbox[4][b] << 27);
				this.gost_sbox[3][i] = dx | (this.sbox[6][b] << 3);
			}
		}
	};
	Gost.rol = function (word, n) {
		return ((word << (n & 0x1f)) | (word >>> (32 - (n & 0x1f))));
	};
	Gost.ch2hex = function (val) {
		var hext = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
		return hext[(val >>> 4) & 15] + hext[val & 15];
	};
	Gost.str2bytes = function (str) {
		var arr = Array(str.length);
		for (var i = 0; i < str.length; ++i)
			arr[i] = str.charCodeAt(i) & 255;
		return arr;
	};
	Gost.prototype.GOST_ENCRYPT_ROUND = function (key1, key2) {
		var tmp = (key1) + this.r;
		this.l ^= this.gost_sbox[0][tmp & 0xff] ^ this.gost_sbox[1][(tmp >>> 8) & 0xff] ^ this.gost_sbox[2][(tmp >>> 16) & 0xff] ^ this.gost_sbox[3][(tmp >>> 24) & 0xff];
		tmp = (key2) + this.l;
		this.r ^= this.gost_sbox[0][tmp & 0xff] ^ this.gost_sbox[1][(tmp >>> 8) & 0xff] ^ this.gost_sbox[2][(tmp >>> 16) & 0xff] ^ this.gost_sbox[3][(tmp >>> 24) & 0xff];
	};
	Gost.prototype.GOST_ENCRYPT = function (ii, key, varhash) {
		this.r = varhash[ii], this.l = varhash[ii + 1];
		this.GOST_ENCRYPT_ROUND(key[0], key[1]);
		this.GOST_ENCRYPT_ROUND(key[2], key[3]);
		this.GOST_ENCRYPT_ROUND(key[4], key[5]);
		this.GOST_ENCRYPT_ROUND(key[6], key[7]);
		this.GOST_ENCRYPT_ROUND(key[0], key[1]);
		this.GOST_ENCRYPT_ROUND(key[2], key[3]);
		this.GOST_ENCRYPT_ROUND(key[4], key[5]);
		this.GOST_ENCRYPT_ROUND(key[6], key[7]);
		this.GOST_ENCRYPT_ROUND(key[0], key[1]);
		this.GOST_ENCRYPT_ROUND(key[2], key[3]);
		this.GOST_ENCRYPT_ROUND(key[4], key[5]);
		this.GOST_ENCRYPT_ROUND(key[6], key[7]);
		this.GOST_ENCRYPT_ROUND(key[7], key[6]);
		this.GOST_ENCRYPT_ROUND(key[5], key[4]);
		this.GOST_ENCRYPT_ROUND(key[3], key[2]);
		this.GOST_ENCRYPT_ROUND(key[1], key[0]);
		return [this.l, this.r];
	};
	Gost.prototype.gost_block_compress = function (block) {
		var key = new Array(8);
		var u = new Array(8);
		var v = new Array(8);
		var w = new Array(8);
		var s = new Array(8);
		/* u := hash, v := <256-bit message block> */
		for (var i = 0; i < 8; i++) {
			u[i] = this.hash[i];
			v[i] = block[i];
		}
		/* w := u xor v */
		w[0] = u[0] ^ v[0];
		w[1] = u[1] ^ v[1];
		w[2] = u[2] ^ v[2];
		w[3] = u[3] ^ v[3];
		w[4] = u[4] ^ v[4];
		w[5] = u[5] ^ v[5];
		w[6] = u[6] ^ v[6];
		w[7] = u[7] ^ v[7];
		/* calculate keys, encrypt hash and store result to the s[] array */
		for (var i = 0;; i += 2) { /* key generation: key_i := P(w) */
			key[0] = (w[0] & 0x000000ff) | ((w[2] & 0x000000ff) << 8) | ((w[4] & 0x000000ff) << 16) | ((w[6] & 0x000000ff) << 24);
			key[1] = ((w[0] & 0x0000ff00) >>> 8) | (w[2] & 0x0000ff00) | ((w[4] & 0x0000ff00) << 8) | ((w[6] & 0x0000ff00) << 16);
			key[2] = ((w[0] & 0x00ff0000) >>> 16) | ((w[2] & 0x00ff0000) >>> 8) | (w[4] & 0x00ff0000) | ((w[6] & 0x00ff0000) << 8);
			key[3] = ((w[0] & 0xff000000) >>> 24) | ((w[2] & 0xff000000) >>> 16) | ((w[4] & 0xff000000) >>> 8) | (w[6] & 0xff000000);
			key[4] = (w[1] & 0x000000ff) | ((w[3] & 0x000000ff) << 8) | ((w[5] & 0x000000ff) << 16) | ((w[7] & 0x000000ff) << 24);
			key[5] = ((w[1] & 0x0000ff00) >>> 8) | (w[3] & 0x0000ff00) | ((w[5] & 0x0000ff00) << 8) | ((w[7] & 0x0000ff00) << 16);
			key[6] = ((w[1] & 0x00ff0000) >>> 16) | ((w[3] & 0x00ff0000) >>> 8) | (w[5] & 0x00ff0000) | ((w[7] & 0x00ff0000) << 8);
			key[7] = ((w[1] & 0xff000000) >>> 24) | ((w[3] & 0xff000000) >>> 16) | ((w[5] & 0xff000000) >>> 8) | (w[7] & 0xff000000);
			/* encryption: s_i := E_{key_i} (h_i) */
			var res = this.GOST_ENCRYPT(i, key, this.hash);
			s[i] = res[0];
			s[i + 1] = res[1];
			if (i == 0) { /* w:= A(u) ^ A^2(v) */
				w[0] = u[2] ^ v[4];
				w[1] = u[3] ^ v[5];
				w[2] = u[4] ^ v[6];
				w[3] = u[5] ^ v[7];
				w[4] = u[6] ^ (v[0] ^= v[2]);
				w[5] = u[7] ^ (v[1] ^= v[3]);
				w[6] = (u[0] ^= u[2]) ^ (v[2] ^= v[4]);
				w[7] = (u[1] ^= u[3]) ^ (v[3] ^= v[5]);
			}
			else if ((i & 2) != 0) {
				if (i == 6)
					break;
				/* w := A^2(u) xor A^4(v) xor C_3; u := A(u) xor C_3 */
				/* C_3=0xff00ffff000000ffff0000ff00ffff0000ff00ff00ff00ffff00ff00ff00ff00 */
				u[2] ^= u[4] ^ 0x000000ff;
				u[3] ^= u[5] ^ 0xff00ffff;
				u[4] ^= 0xff00ff00;
				u[5] ^= 0xff00ff00;
				u[6] ^= 0x00ff00ff;
				u[7] ^= 0x00ff00ff;
				u[0] ^= 0x00ffff00;
				u[1] ^= 0xff0000ff;
				w[0] = u[4] ^ v[0];
				w[2] = u[6] ^ v[2];
				w[4] = u[0] ^ (v[4] ^= v[6]);
				w[6] = u[2] ^ (v[6] ^= v[0]);
				w[1] = u[5] ^ v[1];
				w[3] = u[7] ^ v[3];
				w[5] = u[1] ^ (v[5] ^= v[7]);
				w[7] = u[3] ^ (v[7] ^= v[1]);
			}
			else { /* i==4 here */
				/* w:= A( A^2(u) xor C_3 ) xor A^6(v) */
				w[0] = u[6] ^ v[4];
				w[1] = u[7] ^ v[5];
				w[2] = u[0] ^ v[6];
				w[3] = u[1] ^ v[7];
				w[4] = u[2] ^ (v[0] ^= v[2]);
				w[5] = u[3] ^ (v[1] ^= v[3]);
				w[6] = (u[4] ^= u[6]) ^ (v[2] ^= v[4]);
				w[7] = (u[5] ^= u[7]) ^ (v[3] ^= v[5]);
			}
		}
		/* step hash function: x(block, hash) := psi^61(hash xor psi(block xor psi^12(S))) */
		/* 12 rounds of the LFSR and xor in <message block> */
		u[0] = block[0] ^ s[6];
		u[1] = block[1] ^ s[7];
		u[2] = block[2] ^ (s[0] << 16) ^ (s[0] >>> 16) ^ (s[0] & 0xffff) ^ (s[1] & 0xffff) ^ (s[1] >>> 16) ^ (s[2] << 16) ^ s[6] ^ (s[6] << 16) ^ (s[7] & 0xffff0000) ^ (s[7] >>> 16);
		u[3] = block[3] ^ (s[0] & 0xffff) ^ (s[0] << 16) ^ (s[1] & 0xffff) ^ (s[1] << 16) ^ (s[1] >>> 16) ^ (s[2] << 16) ^ (s[2] >>> 16) ^ (s[3] << 16) ^ s[6] ^ (s[6] << 16) ^ (s[6] >>> 16) ^ (s[7] & 0xffff) ^ (s[7] << 16) ^ (s[7] >>> 16);
		u[4] = block[4] ^ (s[0] & 0xffff0000) ^ (s[0] << 16) ^ (s[0] >>> 16) ^ (s[1] & 0xffff0000) ^ (s[1] >>> 16) ^ (s[2] << 16) ^ (s[2] >>> 16) ^ (s[3] << 16) ^ (s[3] >>> 16) ^ (s[4] << 16) ^ (s[6] << 16) ^ (s[6] >>> 16) ^ (s[7] & 0xffff) ^ (s[7] << 16) ^ (s[7] >>> 16);
		u[5] = block[5] ^ (s[0] << 16) ^ (s[0] >>> 16) ^ (s[0] & 0xffff0000) ^ (s[1] & 0xffff) ^ s[2] ^ (s[2] >>> 16) ^ (s[3] << 16) ^ (s[3] >>> 16) ^ (s[4] << 16) ^ (s[4] >>> 16) ^ (s[5] << 16) ^ (s[6] << 16) ^ (s[6] >>> 16) ^ (s[7] & 0xffff0000) ^ (s[7] << 16) ^ (s[7] >>> 16);
		u[6] = block[6] ^ s[0] ^ (s[1] >>> 16) ^ (s[2] << 16) ^ s[3] ^ (s[3] >>> 16) ^ (s[4] << 16) ^ (s[4] >>> 16) ^ (s[5] << 16) ^ (s[5] >>> 16) ^ s[6] ^ (s[6] << 16) ^ (s[6] >>> 16) ^ (s[7] << 16);
		u[7] = block[7] ^ (s[0] & 0xffff0000) ^ (s[0] << 16) ^ (s[1] & 0xffff) ^ (s[1] << 16) ^ (s[2] >>> 16) ^ (s[3] << 16) ^ s[4] ^ (s[4] >>> 16) ^ (s[5] << 16) ^ (s[5] >>> 16) ^ (s[6] >>> 16) ^ (s[7] & 0xffff) ^ (s[7] << 16) ^ (s[7] >>> 16);
		/* 1 round of the LFSR (a mixing transformation) and xor with <hash> */
		v[0] = this.hash[0] ^ (u[1] << 16) ^ (u[0] >>> 16);
		v[1] = this.hash[1] ^ (u[2] << 16) ^ (u[1] >>> 16);
		v[2] = this.hash[2] ^ (u[3] << 16) ^ (u[2] >>> 16);
		v[3] = this.hash[3] ^ (u[4] << 16) ^ (u[3] >>> 16);
		v[4] = this.hash[4] ^ (u[5] << 16) ^ (u[4] >>> 16);
		v[5] = this.hash[5] ^ (u[6] << 16) ^ (u[5] >>> 16);
		v[6] = this.hash[6] ^ (u[7] << 16) ^ (u[6] >>> 16);
		v[7] = this.hash[7] ^ (u[0] & 0xffff0000) ^ (u[0] << 16) ^ (u[1] & 0xffff0000) ^ (u[1] << 16) ^ (u[6] << 16) ^ (u[7] & 0xffff0000) ^ (u[7] >>> 16);
		/* 61 rounds of LFSR, mixing up hash */
		this.hash[0] = (v[0] & 0xffff0000) ^ (v[0] << 16) ^ (v[0] >>> 16) ^ (v[1] >>> 16) ^ (v[1] & 0xffff0000) ^ (v[2] << 16) ^ (v[3] >>> 16) ^ (v[4] << 16) ^ (v[5] >>> 16) ^ v[5] ^ (v[6] >>> 16) ^ (v[7] << 16) ^ (v[7] >>> 16) ^ (v[7] & 0xffff);
		this.hash[1] = (v[0] << 16) ^ (v[0] >>> 16) ^ (v[0] & 0xffff0000) ^ (v[1] & 0xffff) ^ v[2] ^ (v[2] >>> 16) ^ (v[3] << 16) ^ (v[4] >>> 16) ^ (v[5] << 16) ^ (v[6] << 16) ^ v[6] ^ (v[7] & 0xffff0000) ^ (v[7] >>> 16);
		this.hash[2] = (v[0] & 0xffff) ^ (v[0] << 16) ^ (v[1] << 16) ^ (v[1] >>> 16) ^ (v[1] & 0xffff0000) ^ (v[2] << 16) ^ (v[3] >>> 16) ^ v[3] ^ (v[4] << 16) ^ (v[5] >>> 16) ^ v[6] ^ (v[6] >>> 16) ^ (v[7] & 0xffff) ^ (v[7] << 16) ^ (v[7] >>> 16);
		this.hash[3] = (v[0] << 16) ^ (v[0] >>> 16) ^ (v[0] & 0xffff0000) ^ (v[1] & 0xffff0000) ^ (v[1] >>> 16) ^ (v[2] << 16) ^ (v[2] >>> 16) ^ v[2] ^ (v[3] << 16) ^ (v[4] >>> 16) ^ v[4] ^ (v[5] << 16) ^ (v[6] << 16) ^ (v[7] & 0xffff) ^ (v[7] >>> 16);
		this.hash[4] = (v[0] >>> 16) ^ (v[1] << 16) ^ v[1] ^ (v[2] >>> 16) ^ v[2] ^ (v[3] << 16) ^ (v[3] >>> 16) ^ v[3] ^ (v[4] << 16) ^ (v[5] >>> 16) ^ v[5] ^ (v[6] << 16) ^ (v[6] >>> 16) ^ (v[7] << 16);
		this.hash[5] = (v[0] << 16) ^ (v[0] & 0xffff0000) ^ (v[1] << 16) ^ (v[1] >>> 16) ^ (v[1] & 0xffff0000) ^ (v[2] << 16) ^ v[2] ^ (v[3] >>> 16) ^ v[3] ^ (v[4] << 16) ^ (v[4] >>> 16) ^ v[4] ^ (v[5] << 16) ^ (v[6] << 16) ^ (v[6] >>> 16) ^ v[6] ^ (v[7] << 16) ^ (v[7] >>> 16) ^ (v[7] & 0xffff0000);
		this.hash[6] = v[0] ^ v[2] ^ (v[2] >>> 16) ^ v[3] ^ (v[3] << 16) ^ v[4] ^ (v[4] >>> 16) ^ (v[5] << 16) ^ (v[5] >>> 16) ^ v[5] ^ (v[6] << 16) ^ (v[6] >>> 16) ^ v[6] ^ (v[7] << 16) ^ v[7];
		this.hash[7] = v[0] ^ (v[0] >>> 16) ^ (v[1] << 16) ^ (v[1] >>> 16) ^ (v[2] << 16) ^ (v[3] >>> 16) ^ v[3] ^ (v[4] << 16) ^ v[4] ^ (v[5] >>> 16) ^ v[5] ^ (v[6] << 16) ^ (v[6] >>> 16) ^ (v[7] << 16) ^ v[7];
	};
	Gost.prototype.gost_compute_sum_and_hash = function (block) {
		var carry = 0;
		var hb = 0;
		for (var i = 0; i < 8; i++) {
			hb = (this.sum[i] >>> 24);
			this.sum[i] = (this.sum[i] & 0x00ffffff) + (block[i] & 0x00ffffff) + carry;
			hb = hb + (block[i] >>> 24) + (this.sum[i] >>> 24);
			this.sum[i] = (this.sum[i] & 0x00ffffff) | ((hb & 0xff) << 24);
			carry = ((hb & 0x100) != 0 ? 1 : 0);
		}
		/* update message hash */
		this.gost_block_compress(block);
	};
	Gost.prototype.gost_update = function (_msg, _size) {
		var index = length & 31;
		var msg = _msg, pmsg = 0;
		var size = _size;
		var msg32 = new Array(8);
		length += size;
		/* fill partial block */
		if (index != 0) {
			var left = 32 - index;
			if (size < left) {
				for (var i = 0; i < size; i++)
					this.message[index + i] = msg[i];
				return;
			}
			else
				for (var i = 0; i < left; i++)
					this.message[index + i] = msg[i];
			/* process partitial block */
			for (var i = 0; i < 8; i++)
				msg32[i] = ((this.message[4 * i] & 0xff)) | ((this.message[4 * i + 1] & 0xff) << 8) | ((this.message[4 * i + 2] & 0xff) << 16) | ((this.message[4 * i + 3] & 0xff) << 24);
			this.gost_compute_sum_and_hash(msg32);
			pmsg += left;
			size -= left;
		}
		while (size >= 32) {
			for (var i = 0; i < 8; i++) {
				this.message[4 * i] = msg[pmsg + 4 * i];
				this.message[4 * i + 1] = msg[pmsg + 4 * i + 1];
				this.message[4 * i + 2] = msg[pmsg + 4 * i + 2];
				this.message[4 * i + 3] = msg[pmsg + 4 * i + 3];
				msg32[i] = ((this.message[4 * i] & 0xff)) | ((this.message[4 * i + 1] & 0xff) << 8) | ((this.message[4 * i + 2] & 0xff) << 16) | ((this.message[4 * i + 3] & 0xff) << 24);
			}
			this.gost_compute_sum_and_hash(msg32);
			pmsg += 32;
			size -= 32;
		}
		if (size != 0) {
			for (var i = 0; i < size; i++) {
				this.message[i] = msg[pmsg + i];
			}
		}
	};
	Gost.prototype.gost_final = function () {
		var index = length & 31;
		var msg32 = new Array(8);
		/* pad the last block with zeroes and hash it */
		if (index > 0) {
			for (var i = 0; i < 32 - index; i++) {
				this.message[index + i] = 0;
			}
			for (var i = 0; i < 8; i++) {
				msg32[i] = ((this.message[4 * i] & 0xff)) | ((this.message[4 * i + 1] & 0xff) << 8) | ((this.message[4 * i + 2] & 0xff) << 16) | ((this.message[4 * i + 3] & 0xff) << 24);
			}
			this.gost_compute_sum_and_hash(msg32);
		}
		/* hash the message length and the sum */
		msg32[0] = (length << 3);
		msg32[1] = (length >>> 29);
		for (var i = 2; i < 8; i++) {
			msg32[i] = 0;
		}
		this.gost_block_compress(msg32);
		this.gost_block_compress(this.sum);
	};
	Gost.prototype.hashString = function (input) {
		var rx = new Array(8);
		var x = Gost.str2bytes(this.Utf8.encode(input));
		this.gost_update(x, x.length);
		this.gost_final();
		for (var i = 0; i < 8; i++)
			rx[i] = Gost.ch2hex(this.hash[i] & 0xff) + Gost.ch2hex((this.hash[i] >>> 8) & 0xff) + Gost.ch2hex((this.hash[i] >>> 16) & 0xff) + Gost.ch2hex((this.hash[i] >>> 24) & 0xff);
		return (rx.join("")).toUpperCase();
	};
	Gost.prototype.hashArrayBuffer = function (input) {
		var rx = new Array(8);
		var x = new Uint8Array(input);
		this.gost_update(x, x.length);
		this.gost_final();
		for (var i = 0; i < 8; i++)
			rx[i] = Gost.ch2hex(this.hash[i] & 0xff) + Gost.ch2hex((this.hash[i] >>> 8) & 0xff) + Gost.ch2hex((this.hash[i] >>> 16) & 0xff) + Gost.ch2hex((this.hash[i] >>> 24) & 0xff);
		return (rx.join("")).toUpperCase();
	};
	return Gost;
}());

exports.Gost = Gost;

function gostString(input) {
	var g = new Gost(false);
	return g.hashString(input);
}
exports.gostString = gostString;

function gostStringCryptoPro(input) {
	var g = new Gost(true);
	return g.hashString(input);
}
exports.gostStringCryptoPro = gostStringCryptoPro;

function gostArrayBuffer(input) {
	var g = new Gost(false);
	return g.hashArrayBuffer(input);
}
exports.gostArrayBuffer = gostArrayBuffer;

function gostArrayBufferCryptoPro(input) {
	var g = new Gost(true);
	return g.hashArrayBuffer(input);
}
exports.gostArrayBufferCryptoPro = gostArrayBufferCryptoPro;