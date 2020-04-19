import {addSysExParsers, bytesToHex, stripEnclosure, checkSumError, makeValueFrom7bits} from './sysex_common.js';

const modelPropsXG = [
	// XG/MU
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

	// XG Plugins
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
		commands: [0x00, 0x10, 0x30],
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

	// XG-based Synthesizers
	{
		modelId: 0x4b,
		modelName: 'QS300/B900/CS1x',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x5f,
		modelName: 'QY70/QY100',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x60,
		modelName: 'B2000',
		commands: [0x00, 0x10],
	},
	{
		modelId: 0x63,
		modelName: 'CS2x',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x6c,
		modelName: 'BX/S03/S08',
		commands: [0x00, 0x10, 0x20, 0x30],
	},

	// Non-XG, but same address-based architecture
	{
		modelId: 0x5b,
		modelName: 'EX5/EX7',
		commands: [0x00, 0x10, 0x20],
	},
	{
		modelId: 0x5e,
		modelName: 'FS1R',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x64,
		modelName: 'CS6x/S80/S30',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x6b,
		modelName: 'MOTIF/S90',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: 0x6f,
		modelName: 'MOTIF-RACK',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
/*
	{
		modelId: [0x7f, 0x00],
		modelName: 'MOTIF ES',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: [0x7f, 0x03],
		modelName: 'MOTIF XS',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: [0x7f, 0x04],
		modelName: 'CP300',
		commands: [0x00, 0x20],
	},
	{
		modelId: [0x7f, 0x05],
		modelName: 'CP33',
		commands: [0x00, 0x20],
	},
	{
		modelId: [0x7f, 0x0c],
		modelName: 'CP1',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: [0x7f, 0x0d],
		modelName: 'S90 XS',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: [0x7f, 0x10],
		modelName: 'CP5',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: [0x7f, 0x11],
		modelName: 'CP50',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: [0x7f, 0x12],
		modelName: 'MOTIF XF',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: [0x7f, 0x1a],
		modelName: 'CP4 STAGE',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
	{
		modelId: [0x7f, 0x1b],
		modelName: 'CP40 STAGE',
		commands: [0x00, 0x10, 0x20, 0x30],
	},
*/
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
	// B500, B700 (Switch Remote)
	{
		modelId: 0x28,
		modelName: 'B500/B700',
		paramLen: 4,
	},
	// SY85, TG500
	{
		modelId: 0x29,
		modelName: 'SY85',
		paramLen: 4,
	},
	// P-100, P-500, P-300, P-150, P-200
	{
		modelId: 0x2a,
		modelName: 'P-100',
		paramLen: 4,
	},
	// RM50, RY30
	{
		modelId: 0x30,
		modelName: 'RM50',
		paramLen: 5,
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
/*
	// A7000
	{
		modelId: 0x48,
		modelName: 'A7000',
		paramLen: 7,
		isNibblizedData: true,
	},
	// A5000/A4000
	{
		modelId: 0x58,
		modelName: 'A5000',
		paramLen: 7,
		isNibblizedData: true,
	},
*/
];

function makeParsersXG(modelProp) {
	console.assert(modelProp);

	const commandNames = {
		0x00: 'Bulk Dump',
		0x10: 'Parameter Change',
		0x20: 'Bulk Dump Request',
		0x30: 'Parameter Request',
	};

	const parsers = [];
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
		parsers.push([key, {regexp, handler}]);
	}

	return parsers;
}

function makeParsersGM(modelProp) {
	console.assert(modelProp);

	const commandNames = {
		0x10: 'Parameter Change',
		0x30: 'Bulk Dump Request',
	};

	const parsers = [];
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
		parsers.push([key, {regexp, handler}]);
	}

	return parsers;
}

function makeParsersParam(modelProp) {
	console.assert(modelProp);

	const parsers = [];
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
	parsers.push([key, {regexp, handler}]);

	return parsers;
}

const parsersFMParam = [
	['f0 43 10 00', {
		regexp: /^f0 43 1. 00 .. .. f7$/u,
		handler: makeHandlerForFMParam('DX7', 'Parameter Change (VCED)'),
	}],
	['f0 43 10 01', {
		regexp: /^f0 43 1. 01 .. .. f7$/u,
		handler: makeHandlerForFMParam('DX7', 'Parameter Change (VCED)'),
	}],
	['f0 43 10 08', {
		regexp: /^f0 43 1. 08 [4-7]. .. f7$/u,
		handler: makeHandlerForFMParam('DX7', 'Parameter Change (DX7 Function)'),
	}],
	['f0 43 10 04', {
		regexp: /^f0 43 1. 04 .. .. f7$/u,
		handler: makeHandlerForFMParam('DX1', 'Parameter Change (Performance)'),
	}],
	['f0 43 10 09', {
		regexp: /^f0 43 1. 09 [4-7]. .. f7$/u,
		handler: makeHandlerForFMParam('DX9', 'Parameter Change (DX9 Function)'),
	}],
	['f0 43 10 11', {
		regexp: /^f0 43 1. 11 .. .. f7$/u,
		handler: makeHandlerForFMParam('TX', 'Parameter Change (TX Function)'),
	}],
	['f0 43 10 12', {
		regexp: /^f0 43 1. 12 .. .. f7$/u,
		handler: makeHandlerForFMParam('DX21', 'Parameter Change (4-op VCED)'),
	}],
	['f0 43 10 08', {
		regexp: /^f0 43 1. 08 [0-3]. .. f7$/u,
		handler: makeHandlerForFMParam('DX21', 'Parameter Change (Switch Remote)'),
	}],
	['f0 43 10 18', {
		regexp: /^f0 43 1. 18 .. .. f7$/u,
		handler: makeHandlerForFMParam('DX7II/TX802', 'Parameter Change (ACED)'),
	}],
	['f0 43 10 19', {
		regexp: /^f0 43 1. 19 [0-3]. .. f7$/u,
		handler: makeHandlerForFMParam('DX7II', 'Parameter Change (PCED/PMEM)'),
	}],
	['f0 43 10 19', {
		regexp: /^f0 43 1. 19 [4-7]. .. f7$/u,
		handler: makeHandlerForFMParam('DX7II/TX802', 'Parameter Change (System Setup)'),
	}],
	['f0 43 10 1a', {	// TODO: Support 2-byte parameters
		regexp: /^f0 43 1. 1a .. .. f7$/u,
		handler: makeHandlerForFMParam('TX802', 'Parameter Change (PCED)'),
	}],
	['f0 43 10 1b', {
		regexp: /^f0 43 1. 1b .. .. f7$/u,
		handler: makeHandlerForFMParam('DX7II/TX802', 'Parameter Change (Switch Remote)'),
	}],
	['f0 43 10 18 7e', {
		regexp: /^f0 43 1. 18 7e .. .. .. f7$/u,
		handler: makeHandlerForFMMicroTuning('DX7II/TX802', 'Parameter Change (Micro Tuning)', 0x7e),
	}],
	['f0 43 10 18 7f', {
		regexp: /^f0 43 1. 18 7f .. .. .. .. f7$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 10);
			const [mfrId, deviceId, gh, pp, operatorNo, keyGroupNo, hh, ll] = stripEnclosure(bytes);
			console.assert(mfrId === 0x43 && gh === 0x18 && pp === 0x7f);
			return {
				commandName: 'Parameter Change (Fractional Scaling)',
				modelName:   'DX7II/TX802',
				mfrId, deviceId, operatorNo, keyGroupNo,
				value: makeValueFrom7bits(ll, hh),
			};
		},
	}],
	['f0 43 10 13', {
		regexp: /^f0 43 1. 13 (?!7f).. .. f7$/u,
		handler: makeHandlerForFMParam('TX81Z/V2/V50', 'Parameter Change (4-op ACED1-3)'),
	}],
	['f0 43 10 13 7f', {
		regexp: /^f0 43 1. 13 7f .. f7$/u,
		handler: makeHandlerForFMParam('TX81Z/V2/V50', 'Parameter Change (Switch Remote)'),
	}],
	['f0 43 10 10', {
		regexp: /^f0 43 1. 10 .. .. f7$/u,
		handler: makeHandlerForFMParam('TX81Z/V2/V50', 'Parameter Change (4-op PCED)'),
	}],
	['f0 43 10 10 6e', {
		regexp: /^f0 43 1. 10 6e .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V50', 'Parameter Change (4-op PCED2)', 0x6e),
	}],
	['f0 43 10 10 7b', {
		regexp: /^f0 43 1. 10 7b .. .. f7$/u,
		handler: makeHandlerForFMParamEx('TX81Z/V2/V50', 'Parameter Change (SYS/SYS2/SYS3)', 0x7b),
	}],
	['f0 43 10 10 7c', {
		regexp: /^f0 43 1. 10 7c .. .. f7$/u,
		handler: makeHandlerForFMParamEx('TX81Z/V2/V50', 'Parameter Change (EFG1)', 0x7c),
	}],
	['f0 43 10 10 78', {
		regexp: /^f0 43 1. 10 78 .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V2/V50', 'Parameter Change (EFG2)', 0x78),
	}],
	['f0 43 10 10 79', {
		regexp: /^f0 43 1. 10 79 .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V2/V50', 'Parameter Change (EFG3)', 0x79),
	}],
	['f0 43 10 10 7a', {
		regexp: /^f0 43 1. 10 7a .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V2/V50', 'Parameter Change (EFG4)', 0x7a),
	}],
	['f0 43 10 10 7d', {
		regexp: /^f0 43 1. 10 7d .. .. .. f7$/u,
		handler: makeHandlerForFMMicroTuning('TX81Z/V2/V50', 'Parameter Change (Micro Tuning / Oct)', 0x7d),
	}],
	['f0 43 10 10 7e', {
		regexp: /^f0 43 1. 10 7e .. .. .. f7$/u,
		handler: makeHandlerForFMMicroTuning('TX81Z/V2/V50', 'Parameter Change (Micro Tuning / Full)', 0x7e),
	}],
	['f0 43 10 10 7f', {
		regexp: /^f0 43 1. 10 7f .. .. .. f7$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 9);
			const [mfrId, deviceId, gh, pp, programNo, hh, ll] = stripEnclosure(bytes);
			console.assert(mfrId === 0x43 && gh === 0x10 && pp === 0x7f);
			return {
				commandName: 'Parameter Change (Program Change Table)',
				modelName:   'TX81Z/V2/V50',
				mfrId, deviceId, programNo,
				value: makeValueFrom7bits(ll, hh),
			};
		},
	}],
	['f0 43 10 10 6f', {
		regexp: /^f0 43 1. 10 6f .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V50', 'Parameter Change (SYSQ)', 0x6f),
	}],
	['f0 43 10 10 70', {
		regexp: /^f0 43 1. 10 70 .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V50', 'Parameter Change (SYSR)', 0x70),
	}],
	['f0 43 10 10 71', {
		regexp: /^f0 43 1. 10 71 .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V50', 'Parameter Change (RINST1)', 0x71),
	}],
	['f0 43 10 10 72', {
		regexp: /^f0 43 1. 10 72 .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V50', 'Parameter Change (RINST2)', 0x72),
	}],
	['f0 43 10 10 73', {
		regexp: /^f0 43 1. 10 73 .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V50', 'Parameter Change (RKAT1)', 0x73),
	}],
	['f0 43 10 10 74', {
		regexp: /^f0 43 1. 10 74 .. .. f7$/u,
		handler: makeHandlerForFMParamEx('V50', 'Parameter Change (RKAT2)', 0x74),
	}],
	['f0 43 10 15', {
		regexp: /^f0 43 1. 15 [0-3]. .. f7$/u,
		handler: makeHandlerForFMParam('FB-01', 'Parameter Change (1-byte)'),
	}],
	['f0 43 10 15', {
		regexp: /^f0 43 1. 15 [4-7]. .. .. f7$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 8);
			const [mfrId, deviceId, gh, paramNo, ll, hh] = stripEnclosure(bytes);
			console.assert(mfrId === 0x43 && gh === 0x15);
			return {
				commandName: 'Parameter Change (2-byte)',
				modelName:   'FB-01',
				mfrId, deviceId, paramNo,
				value: ((hh & 0x0f) << 4) | (ll & 0x0f),
			};
		},
	}],
	['f0 43 10 20', {
		regexp: /^f0 43 1. 20 .. .. f7$/u,
		handler: makeHandlerForFMParam('TX16W', 'Parameter Change (System Setup)'),
	}],
	['f0 43 10 21', {
		regexp: /^f0 43 1. 21 .. .. f7$/u,
		handler: makeHandlerForFMParam('TX16W', 'Parameter Change (Performance)'),
	}],
	['f0 43 10 22', {
		regexp: /^f0 43 1. 22 .. .. f7$/u,
		handler: makeHandlerForFMParam('TX16W', 'Parameter Change (Voice)'),
	}],
	['f0 43 10 23', {
		regexp: /^f0 43 1. 23 .. .. f7$/u,
		handler: makeHandlerForFMParam('TX16W', 'Parameter Change (Filter)'),
	}],
	['f0 43 10 24', {
		regexp: /^f0 43 1. 24 .. .. f7$/u,
		handler: makeHandlerForFMParam('YS200', 'Parameter Change (System Setup / Switch Remote)'),
	}],
	['f0 43 10 25', {
		regexp: /^f0 43 1. 25 .. .. f7$/u,
		handler: makeHandlerForFMParam('DS55', 'Parameter Change (System Setup / Delay)'),
	}],
];

function makeHandlerForFMParam(modelName, commandName) {
	return ((modelName, commandName) => (bytes) => {
		console.assert(bytes && bytes.length === 7);
		const [mfrId, deviceId, gh, pp, dd] = stripEnclosure(bytes);
		console.assert(mfrId === 0x43);
		return {
			commandName, modelName, mfrId, deviceId,
			paramNo: makeValueFrom7bits(gh, pp) & 0xff,
			value:   dd,
		};
	})(modelName, commandName);
}

function makeHandlerForFMParamEx(modelName, commandName, fixedParamNo) {
	return ((modelName, commandName) => (bytes) => {
		console.assert(bytes && bytes.length === 8);
		const [mfrId, deviceId, gh, pp, kk, dd] = stripEnclosure(bytes);
		console.assert(mfrId === 0x43 && gh < 0x26 && pp === fixedParamNo);
		return {
			commandName, modelName, mfrId, deviceId, fixedParamNo,
			paramNo: kk,
			value:   dd,
		};
	})(modelName, commandName, fixedParamNo);
}

function makeHandlerForFMMicroTuning(modelName, commandName, fixedParamNo) {
	return ((modelName, commandName) => (bytes) => {
		console.assert(bytes && bytes.length === 9);
		const [mfrId, deviceId, gh, pp, noteNo, hh, ll] = stripEnclosure(bytes);
		console.assert(mfrId === 0x43 && gh < 0x26 && pp === fixedParamNo);
		return {
			commandName, modelName, mfrId, deviceId, fixedParamNo, noteNo,
			value: makeValueFrom7bits(hh, ll),
		};
	})(modelName, commandName, fixedParamNo);
}

const parsersBulkDump = [
	// Bulk Dump (FM)
	['f0 43 00 00', {
		regexp: /^f0 43 0. 00 .. .. (?:.. )+f7$/u,
		handler: makeHandlerForFMDump('DX7', 'Bulk Dump (VCED)'),
	}],
	['f0 43 00 01', {
		regexp: /^f0 43 0. 01 .. .. (?:.. )+f7$/u,
		handler: makeHandlerForFMDump('DX7', 'Bulk Dump (PCED)'),
	}],
	['f0 43 00 02', {
		regexp: /^f0 43 0. 02 .. .. (?:.. )+f7$/u,
		handler: makeHandlerForFMDump('DX1', 'Bulk Dump (PMEM)'),
	}],
	['f0 43 00 03', {
		regexp: /^f0 43 0. 03 .. .. (?:.. )+f7$/u,
		handler: makeHandlerForFMDump('DX21', 'Bulk Dump (4-op VCED)'),
	}],
	['f0 43 00 04', {
		regexp: /^f0 43 0. 04 .. .. (?:.. )+f7$/u,
		handler: makeHandlerForFMDump('DX21', 'Bulk Dump (4-op VMEM)'),
	}],
	['f0 43 00 05', {
		regexp: /^f0 43 0. 05 .. .. (?:.. )+f7$/u,
		handler: makeHandlerForFMDump('DX7', 'Bulk Dump (ACED)'),
	}],
	['f0 43 00 06', {
		regexp: /^f0 43 0. 06 .. .. (?:.. )+f7$/u,
		handler: makeHandlerForFMDump('DX7', 'Bulk Dump (AMEM)'),
	}],
	['f0 43 00 09', {
		regexp: /^f0 43 0. 09 .. .. (?:.. )+f7$/u,
		handler: makeHandlerForFMDump('DX7', 'Bulk Dump (VMEM)'),
	}],

	// Bulk Dump Request (FM)
	['f0 43 20 00 f7', {
		regexp: /^f0 43 2. 00 f7$/u,
		handler: makeHandlerForFMDumpRequest('DX1', 'Bulk Dump Request (VCED)'),
	}],
	['f0 43 20 01 f7', {
		regexp: /^f0 43 2. 01 f7$/u,
		handler: makeHandlerForFMDumpRequest('DX1', 'Bulk Dump Request (PCED)'),
	}],
	['f0 43 20 02 f7', {
		regexp: /^f0 43 2. 02 f7$/u,
		handler: makeHandlerForFMDumpRequest('DX1', 'Bulk Dump Request (PMEM)'),
	}],
	['f0 43 20 03 f7', {
		regexp: /^f0 43 2. 03 f7$/u,
		handler: makeHandlerForFMDumpRequest('DX21', 'Bulk Dump Request (4-op VCED)'),
	}],
	['f0 43 20 04 f7', {
		regexp: /^f0 43 2. 04 f7$/u,
		handler: makeHandlerForFMDumpRequest('DX21', 'Bulk Dump Request (4-op VMEM)'),
	}],
	['f0 43 20 05 f7', {
		regexp: /^f0 43 2. 05 f7$/u,
		handler: makeHandlerForFMDumpRequest('DX7II', 'Bulk Dump Request (ACED)'),
	}],
	['f0 43 20 06 f7', {
		regexp: /^f0 43 2. 06 f7$/u,
		handler: makeHandlerForFMDumpRequest('DX7II', 'Bulk Dump Request (AMEM)'),
	}],
	['f0 43 20 09 f7', {
		regexp: /^f0 43 2. 09 f7$/u,
		handler: makeHandlerForFMDumpRequest('DX1', 'Bulk Dump Request (VMEM)'),
	}],

	// Bulk Dump (FM Universal)
	['f0 43 00 7e', {
		regexp: /^f0 43 0. 7e (?:.. .. 4c 4d 20 20 .. .. .. .. .. .. (?:.. )+)+f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, commandId, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x43 && commandId === 0x7e);

			const packets = [];
			let index = 0;
			while (index < rest.length - 2 - 10) {
				const byteCount = makeValueFrom7bits(rest[index + 1], rest[index]);

				const begin = index;
				const end   = index + 2 + byteCount + 1;

				const formatName = String.fromCharCode(...rest.slice(begin + 2, begin + 2 + 10));
				const payload = rest.slice(begin + 2 + 10, end - 1);
				const checkSum = rest[end - 1];
				const isCheckSumError = checkSumError(rest.slice(begin + 2, end - 0));

				packets.push({formatName, payload, checkSum, isCheckSumError});
				index = end;
			}

			if (index !== rest.length || packets.length === 0) {
				return null;
			}

			const obj = {
				commandName: 'Bulk Dump (Universal)',
				modelName:   'DX/TX',
				mfrId, deviceId, commandId,
			};

			console.assert(packets.length > 0);
			if (packets.length === 1) {
				return {...obj, ...packets[0]};
			} else {
				return {...obj, packets};
			}
		},
	}],

	// Bulk Dump Request (FM Universal)
	['f0 43 20 7e', {
		regexp: /^f0 43 2. 7e .. .. .. .. .. .. .. .. .. .. f7$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 15);
			const [mfrId, deviceId, commandId, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x43 && commandId === 0x7e);

			return {
				commandName: 'Bulk Dump Request (Universal)',
				modelName:   'DX/TX',
				mfrId, deviceId, commandId,
				formatName: String.fromCharCode(...rest),
			};
		},
	}],

	// Bulk Dump (SY/TG)
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

	// Bulk Dump Request (SY/TG)
	['f0 43 20 7a', {
		regexp: /^f0 43 [02]. [07]a 4c 4d 20 20 .. .. .. .. .. .. (?:(?:.. ){14})?f7$/u,
		handler: (bytes) => {
			console.assert(bytes && (bytes.length === 14 || bytes.length === 30));
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
];

function makeHandlerForFMDump(modelName, commandName) {
	return ((modelName, commandName) => (bytes) => {
		const [mfrId, deviceId, formatId, byteCountM, byteCountL, ...rest] = stripEnclosure(bytes);
		console.assert(mfrId === 0x43);

		const byteCount = makeValueFrom7bits(byteCountL, byteCountM);
		const checkSum = rest.pop();
		const isCheckSumError = checkSumError(bytes.slice(6, -1));

		return {
			commandName, modelName, mfrId, deviceId, formatId, byteCount, checkSum, isCheckSumError,
		};
	})(modelName, commandName);
}

function makeHandlerForFMDumpRequest(modelName, commandName) {
	return ((modelName, commandName) => (bytes) => {
		console.assert(bytes && bytes.length === 5);
		const [mfrId, deviceId, formatId] = stripEnclosure(bytes);
		return {
			commandName, modelName, mfrId, deviceId, formatId,
		};
	})(modelName, commandName);
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
addSysExParsers(parsersFMParam);
addSysExParsers(parsersBulkDump);
