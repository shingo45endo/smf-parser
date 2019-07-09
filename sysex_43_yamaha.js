import {addSysExParsers, bytesToHex, stripEnclosure, checkSumError, makeValueFrom7bits} from './sysex_instance.js';

const modelPropsXG = new Map([
	// XG
	[0x4c, {
		name: 'XG',
		commands: [0x00, 0x10, 0x20, 0x30],
	}],
	[0x49, {
		name: 'MU Native',
		commands: [0x00, 0x10, 0x20, 0x30],
	}],
	[0x59, {
		name: 'MU Native 2',
		commands: [0x00, 0x10, 0x20, 0x30],
	}],

	[0x55, {
		name: 'VL70-m',
		commands: [0x00, 0x10, 0x20, 0x30],
	}],
	[0x57, {
		name: 'PLG-VL',
		commands: [0x00, 0x10],
	}],
	[0x5c, {
		name: 'PLG-AN',
		commands: [0x00, 0x10],
	}],
	[0x5d, {
		name: 'PLG-SG',
		commands: [0x00, 0x10/* , 0x30 */],
	}],
	[0x62, {
		name: 'PLG-DX',
		commands: [0x00, 0x10],
	}],
	[0x67, {
		name: 'PLG-PF/DR/PC/AP',
		commands: [0x00, 0x10],
	}],
]);

const modelPropsGM = new Map([
	[0x27, {
		name: 'TG100',
		commands: [0x10],
	}],
	[0x2b, {
		name: 'TG300',
		commands: [0x10, 0x30],
	}],
	[0x44, {
		name: 'MU5',
		commands: [0x10, 0x30],
	}],
]);

const parsersBulkDump = new Map([
	// Bulk Dump
	['f0 43 00 7a', {
		regexp: /^f0 43 0. [07]a .. .. 4c 4d 20 20 .. .. .. .. .. .. 00 00 00 00 00 00 00 00 00 00 00 00 00 00 .. .. (?:.. )+f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, commandId, byteCountM, byteCountL, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x43 && (commandId & 0x0f) === 0x0a);

			const byteCount = makeValueFrom7bits(byteCountL, byteCountM);
			const formatName = String.fromCharCode(...rest.slice(0, 10));
			const checkSum = rest.pop();
			const isCheckSumError = checkSumError(bytes.slice(6, -1));

			return {
				commandName: 'Bulk Dump',
				modelName:   'SY/TG',
				mfrId, deviceId, commandId, byteCount, formatName, checkSum, isCheckSumError,
				memoryType: bytes[30],
				memoryNo:   bytes[31],
				payload:    bytes.slice(32, -2),
			};
		},
	}],
	// Bulk Dump Request
	['f0 43 20 7a', {
		regexp: /^f0 43 [02]. [07]a 4c 4d 20 20 .. .. .. .. .. .. (?:(?:.. ){14})?f7$/u,
		handler: (bytes) => {
			console.assert(bytes.length === 14 || bytes.length === 30);
			const [mfrId, deviceId, commandId, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x43 && (commandId & 0x0f) === 0x0a);
			const formatName = String.fromCharCode(...rest.slice(0, 10));

			const obj = {
				commandName: 'Bulk Dump Request',
				modelName:   'SY/TG',
				mfrId, deviceId, commandId, formatName,
			};

			if (bytes.length === 14) {
				return obj;
			} else {
				if (bytes.slice(14, 28).every((e) => e === 0x00)) {
					return {
						...obj,
						memoryType: bytes[28],
						memoryNo:   bytes[29],
					};
				} else {
					const [addrH, addrM, addrL, byteCountH, byteCountM, byteCountL] = rest;
					const address = [addrH, addrM, addrL];
					const byteCount = makeValueFrom7bits(byteCountL, byteCountM, byteCountH);
					const checkSum = rest.pop();
					const isCheckSumError = checkSumError(bytes.slice(6, -1));

					return {
						...obj,
						modelName: 'TG100',
						address, byteCount, checkSum, isCheckSumError,
					};
				}	
			}
		},
	}],
]);

function makeParsersXG(modelId, modelProps) {
	console.assert(modelProps);

	const commandNames = {
		0x00: 'Bulk Dump',
		0x10: 'Parameter Change',
		0x20: 'Bulk Dump Request',
		0x30: 'Parameter Request',
	};

	const parsers = new Map();
	for (const command of modelProps.commands) {
		const str = `f0 43 ${bytesToHex([command])[0]}. ${bytesToHex([modelId])}`;

		let regexp, handler;
		switch (command) {
		case 0x00: // Bulk Dump
			regexp = new RegExp(String.raw`^${str} .. .. .. .. .. (?:.. )+.. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, byteCountM, byteCountL, addrH, addrM, addrL, ...payload] = stripEnclosure(bytes);
				console.assert(mfrId === 0x43 && (deviceId & 0xf0) === command && payload && payload.length > 0);
				const byteCount = makeValueFrom7bits(byteCountL, byteCountM);
				const address = [addrH, addrM, addrL];

				const checkSum = payload.pop();
				const isCheckSumError = checkSumError(bytes.slice(4, -1));

				return {mfrId, deviceId, modelId, modelName, address, byteCount, payload, checkSum, isCheckSumError, commandName};
			})(modelProps.name, commandNames[command]);
			break;

		case 0x10: // Parameter Change
			regexp = new RegExp(String.raw`^${str} .. .. .. (?:.. )+f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, addrH, addrM, addrL, ...payload] = stripEnclosure(bytes);
				console.assert(mfrId === 0x43 && (deviceId & 0xf0) === command && payload && payload.length > 0);
				const address = [addrH, addrM, addrL];

				return {mfrId, deviceId, modelId, modelName, address, payload, commandName};
			})(modelProps.name, commandNames[command]);
			break;

		case 0x20: // Bulk Dump Request
		case 0x30: // Parameter Request
			regexp = new RegExp(String.raw`^${str} .. .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, addrH, addrM, addrL] = stripEnclosure(bytes);
				console.assert(mfrId === 0x43 && (deviceId & 0xf0) === command);
				const address = [addrH, addrM, addrL];

				return {mfrId, deviceId, modelId, modelName, address, commandName};
			})(modelProps.name, commandNames[command]);
			break;

		default:
			console.assert(false, 'Unexpected case', {command});
			break;
		}

		const key = str.replace('.', '0');
		parsers.set(key, {regexp, handler});
	}

	return parsers;
}

function makeParsersGM(modelId, modelProps) {
	console.assert(modelProps);

	const commandNames = {
		0x10: 'Parameter Change',
		0x30: 'Bulk Dump Request',
	};

	const parsers = new Map();
	for (const command of modelProps.commands) {
		const str = `f0 43 ${bytesToHex([command])[0]}. ${bytesToHex([modelId])}`;

		let regexp, handler;
		switch (command) {
		case 0x10: // Parameter Change
			regexp = new RegExp(String.raw`^${str} .. .. .. (?:.. )+.. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, addrH, addrM, addrL, ...payload] = stripEnclosure(bytes);
				console.assert(mfrId === 0x43 && (deviceId & 0xf0) === command && payload && payload.length > 0);
				const address = [addrH, addrM, addrL];

				const checkSum = payload.pop();
				const isCheckSumError = checkSumError([...bytes.slice(4, -1)]);

				return {mfrId, deviceId, modelId, modelName, address, payload, checkSum, isCheckSumError, commandName};
			})(modelProps.name, commandNames[command]);
			break;

		case 0x30: // Bulk Dump Request
			regexp = new RegExp(String.raw`^${str} .. .. .. .. .. .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, byteCountH, byteCountM, byteCountL, addrH, addrM, addrL, checkSum] = stripEnclosure(bytes);
				console.assert(mfrId === 0x43 && (deviceId & 0xf0) === command);
				const byteCount = makeValueFrom7bits(byteCountL, byteCountM, byteCountH);
				const address = [addrH, addrM, addrL];
				const isCheckSumError = checkSumError(bytes.slice(4, -1));

				return {mfrId, deviceId, modelId, modelName, address, byteCount, checkSum, isCheckSumError, commandName};
			})(modelProps.name, commandNames[command]);
			break;

		default:
			console.assert(false, 'Unexpected case', {command});
			break;
		}

		const key = str.replace('.', '0');
		parsers.set(key, {regexp, handler});
	}

	return parsers;
}

// Add SysEx parsers.
for (const model of modelPropsXG) {
	const parsers = makeParsersXG(...model);
	addSysExParsers(parsers);
}
for (const model of modelPropsGM) {
	const parsers = makeParsersGM(...model);
	addSysExParsers(parsers);
}
addSysExParsers(parsersBulkDump);
