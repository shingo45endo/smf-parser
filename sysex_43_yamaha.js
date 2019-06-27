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
				const size = makeValueFrom7bits(byteCountL, byteCountM);
				const address = [addrH, addrM, addrL];

				const checkSum = payload.pop();
				const isCheckSumError = checkSumError(bytes.slice(4, -1));

				return {mfrId, deviceId, modelId, modelName, address, size, payload, checkSum, isCheckSumError, commandName};
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
				const size = makeValueFrom7bits(byteCountL, byteCountM, byteCountH);
				const address = [addrH, addrM, addrL];
				const isCheckSumError = checkSumError(bytes.slice(4, -1));

				return {mfrId, deviceId, modelId, modelName, address, size, checkSum, isCheckSumError, commandName};
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
