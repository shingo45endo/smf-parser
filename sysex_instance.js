export class SysEx {
	constructor() {
		this._parsers = new Map();
		this._map = new Map();
	}

	_findParser(bytes) {
		console.assert(bytes && bytes.length, 'Invalid argument', {bytes});
		console.assert(isValidSysEx(bytes), 'Invalid SysEx', {bytes});

		// Gets the array of parsers for this SysEx bytes.
		let parsers = null;
		for (let i = 0; i < bytes.length; i++) {
			const key = bytesToHex(bytes.slice(0, i + 1));
			if (!this._map.has(key)) {
				break;
			}
			parsers = this._map.get(key);
		}
		console.assert(Array.isArray(parsers));

		// Searches the SysEx parser which can handle this SysEx bytes.
		const hexStr = bytesToHex(bytes);
		for (const parser of parsers) {
			if (parser.regexp && parser.regexp.test(hexStr)) {
				return parser;
			}
		}

		return null;
	}

	analyze(bytes) {
		console.assert(bytes && bytes.length, 'Invalid argument', {bytes});

		// Checks if the SysEx bytes valid or not.
		if (!isValidSysEx(bytes)) {
			return {isInvalid: true, desc: 'Invalid SysEx'};
		}

		// Gets a manufacturer's ID and a device ID.
		let [mfrId, deviceId] = stripEnclosure(bytes);
		if (mfrId === 0x00) {
			// Deals with 3-byte manufacturer's ID.
			const [mfrId0, mfrId1, mfrId2, newDeviceId] = stripEnclosure(bytes);
			mfrId = [mfrId0, mfrId1, mfrId2];
			deviceId = newDeviceId;
		}

		//
		const result = {mfrId, deviceId, hexStr: bytesToHex(bytes)/* , desc: 'Unknown SysEx' */};
		const parser = this._findParser(bytes);
		if (parser) {
			Object.assign(result, parser.handler(bytes));
		}

		return result;
	}

	isAcceptable(bytes) {
		console.assert(bytes && bytes.length, 'Invalid argument', {bytes});
		return isValidSysEx(bytes) && this._findParser(bytes) !== null;
	}

	addParsers(parsers) {
		console.assert(parsers instanceof Map, 'Invalid argument', {parsers});

		parsers.forEach((value, key) => {
			console.assert(/^(?:.. )+..$/u.test(key), 'Invalid key format', {key, value});
			console.assert(!this._parsers.has(key), 'Already exists', {key, value});

			// Adds a parser.
			this._parsers.set(key, value);

			//
			const strs = key.split(' ');
			for (let i = 0; i < strs.length; i++) {
				const key = strs.slice(0, i + 1).join(' ');
				if (!this._map.has(key)) {
					this._map.set(key, []);
				}
				const array = this._map.get(key);
				console.assert(Array.isArray(array));
				array.push(value);
			}
		});
	}

	getParsers(sysExIds) {
		console.assert(Array.isArray(sysExIds), 'Invalid argument', {sysExIds});
		console.assert(sysExIds.every((e) => /^[0-9a-f ]+$/u.test(e), 'Invalid argument', {sysExIds}));

		const parsers = new Map();
		for (const sysExId of sysExIds) {
			[...this._parsers.keys()].filter((e) => e.indexOf(sysExId) === 0).forEach((key) => {
				console.assert(this._parsers.has(key));
				parsers.set(key, this._parsers.get(key));
			});
		}

		return parsers;
	}
}

function isValidSysEx(bytes) {
	console.assert(bytes && bytes.length, 'Invalid argument', {bytes});

	// Is the SysEx start with "f0" and end with "f7"?
	if (!bytes || bytes.length < 6 || bytes[0] !== 0xf0 || bytes[bytes.length - 1] !== 0xf7) {
		return false;
	}

	// Is there any valid payload? ("3": f0, f7, and device ID)
	if (bytes.length - 3 - ((bytes[1] !== 0x00) ? 1 : 3)  <= 0) {
		return false;
	}

	return true;
}

export function bytesToHex(bytes) {
	console.assert(bytes && bytes.length, 'Invalid argument', {bytes});
	return [...bytes].map((e) => `0${Number(e).toString(16)}`.slice(-2)).join(' ');
}

export function stripEnclosure(bytes) {
	console.assert(bytes && bytes.length, 'Invalid argument', {bytes});
	console.assert(isValidSysEx(bytes), 'Invalid SysEx', {bytes});
	return bytes.slice(1, -1);
}

export function checkSumError(bytes) {
	console.assert(bytes && bytes.length, 'Invalid argument', {bytes});
	return bytes.reduce((p, c) => p + c) % 0x80 === 0;
}

const sysEx = new SysEx();

export function analyzeSysEx(bytes) {
	return sysEx.analyze(bytes);
}

export function addSysExParsers(parsers) {
	sysEx.addParsers(parsers);
}

export function createSubsetSysExParser(sysExIds) {
	const subset = new SysEx();
	subset.addParsers(sysEx.getParsers(sysExIds));
	return subset;
}
