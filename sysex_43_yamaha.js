import {addSysExParsers, bytesToHex, stripEnclosure, checkSumError, makeValueFrom7bits} from './sysex_common.js';

const modelPropsXG = [
	// XG
	{
		modelId: 0x4c,
		modelName: 'XG',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x49,
		modelName: 'MU Native',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x59,
		modelName: 'MU Native 2',
		commands: [0x00, 0x10, 0x20, 0x30],
	},

	{
		modelId: 0x55,
		modelName: 'VL70-m/P50-m',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x57,
		modelName: 'PLG-VL',
		commands: [0x00, 0x10],
	},
	{
		modelId: 0x5c,
		modelName: 'PLG-AN/AN1x',
		commands: [0x00, 0x10],
	},
	{
		modelId: 0x5d,
		modelName: 'PLG-SG',
		commands: [0x00, 0x10/* , 0x30 */],
	},
	{
		modelId: 0x62,
		modelName: 'PLG-DX',
		commands: [0x00, 0x10],
	},
	{
		modelId: 0x67,
		modelName: 'PLG-PF/DR/PC/AP',
		commands: [0x00, 0x10],
	},
];

const modelPropsGM = [
	{
		modelId: 0x27,
		modelName: 'TG100',
		commands: [0x10],
	},
	{
		modelId: 0x2b,
		modelName: 'TG300',
		commands: [0x10, 0x30],
	},
	{
		modelId: 0x44,
		modelName: 'MU5',
		commands: [0x10, 0x30],
	},
];

const modelPropsParam = [
	// TG33
	{
		modelId: 0x26,
		modelName: 'TG33',
		paramLen: 7,
	},
	// SY85, TG500
	{
		modelId: 0x29,
		modelName: 'SY85',
		paramLen: 4,
	},
	// SY77, TG77, SY99
	{
		modelId: 0x34,
		modelName: 'SY77',
		paramLen: 4,
	},
	// TG55, SY55
	{
		modelId: 0x35,
		modelName: 'TG55',
		paramLen: 4,
	},
];

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

			} else if (bytes.slice(14, 28).every((e) => (e === 0x00))) {
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
		},
	}],
]);

function makeParsersXG(modelProp) {
	console.assert(modelProp);

	const commandNames = {
		0x00: 'Bulk Dump',
		0x10: 'Parameter Change',
		0x20: 'Bulk Dump Request',
		0x30: 'Parameter Request',
	};

	const parsers = new Map();
	for (const command of modelProp.commands) {
		const str = `f0 43 ${bytesToHex([command])[0]}. ${bytesToHex([modelProp.modelId])}`;

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
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x10: // Parameter Change
			regexp = new RegExp(String.raw`^${str} .. .. .. (?:.. )+f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, addrH, addrM, addrL, ...payload] = stripEnclosure(bytes);
				console.assert(mfrId === 0x43 && (deviceId & 0xf0) === command && payload && payload.length > 0);
				const address = [addrH, addrM, addrL];

				return {mfrId, deviceId, modelId, modelName, address, payload, commandName};
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x20: // Bulk Dump Request
		case 0x30: // Parameter Request
			regexp = new RegExp(String.raw`^${str} .. .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, addrH, addrM, addrL] = stripEnclosure(bytes);
				console.assert(mfrId === 0x43 && (deviceId & 0xf0) === command);
				const address = [addrH, addrM, addrL];

				return {mfrId, deviceId, modelId, modelName, address, commandName};
			})(modelProp.modelName, commandNames[command]);
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

function makeParsersGM(modelProp) {
	console.assert(modelProp);

	const commandNames = {
		0x10: 'Parameter Change',
		0x30: 'Bulk Dump Request',
	};

	const parsers = new Map();
	for (const command of modelProp.commands) {
		const str = `f0 43 ${bytesToHex([command])[0]}. ${bytesToHex([modelProp.modelId])}`;

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
			})(modelProp.modelName, commandNames[command]);
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
			})(modelProp.modelName, commandNames[command]);
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

function makeParsersParam(modelProp) {
	console.assert(modelProp);

	const parsers = new Map();
	const str = `f0 43 1. ${bytesToHex([modelProp.modelId])}`;

	const regexp = new RegExp(String.raw`^${str}(?: ..){${modelProp.paramLen}}(?: ..){2} f7$`, 'u');
	const handler = ((modelName, paramLen) => (bytes) => {
		const [mfrId, deviceId, modelId, ...rest] = stripEnclosure(bytes);
		console.assert(mfrId === 0x43 && (deviceId & 0xf0) === 0x10 && rest.length === paramLen + 2);
		const paramNos = rest.slice(0, paramLen);
		const value    = makeValueFrom7bits(rest[paramLen + 1], rest[paramLen]);

		return {
			commandName: 'Parameter Change',
			mfrId, deviceId, modelId, modelName, paramNos, value,
		};
	})(modelProp.modelName, modelProp.paramLen);

	const key = str.replace('.', '0');
	parsers.set(key, {regexp, handler});
	return parsers;
}

// Add SysEx parsers.
for (const modelProp of modelPropsXG) {
	const parsers = makeParsersXG(modelProp);
	addSysExParsers(parsers);
}
for (const modelProp of modelPropsGM) {
	const parsers = makeParsersGM(modelProp);
	addSysExParsers(parsers);
}
for (const modelProp of modelPropsParam) {
	const parsers = makeParsersParam(modelProp);
	addSysExParsers(parsers);
}
addSysExParsers(parsersBulkDump);
