import {addSysExParsers, bytesToHex, stripEnclosure, checkSumError, makeValueFrom7bits, convert7to8bits} from './sysex_common.js';

const modelProps = [
	// M1, M1R
	{
		modelId: 0x19,
		modelName: 'M1',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x18, 0x0e, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x48, 0x51, 0x50, 0x4e, 0x41, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	},
	// M3R
	{
		modelId: 0x24,
		modelName: 'M3R',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	},
	// T1/T2/T3
	{
		modelId: 0x26,
		modelName: 'T1',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x18, 0x0e, 0x0f, 0x15, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x48, 0x51, 0x50, 0x44, 0x4e, 0x41, 0x53, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	},
	// 01/W, 01R/W
	{
		modelId: 0x2b,
		modelName: '01/W',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x18, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x48, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x53, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	},
	// 03R/W
	{
		modelId: 0x30,
		modelName: '03R/W',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x06, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x55, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x53, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	},
	// AG-10
	{
		modelId: 0x34,
		modelName: 'AG-10',
		commands: [0x40],
	},
	// X3, X2, N264/364
	{
		modelId: 0x35,
		modelName: 'X3',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x18, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x48, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x53, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	},
	// 05R/W, X5, X5D, X5DR
	{
		modelId: 0x36,
		modelName: '05R/W',
		// Note that the commands 0x33 and 0x68 (for expansion of Multi data) are not available for 05R/W.
		// But, they (05R/W and X5*) have the same model ID (== 0x36) so they cannot be distinguished each other.
		commands: [0x12, 0x10, 0x1c, 0x19, 0x1d, 0x06, 0x33, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x55, 0x68, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x53, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	},
];

const commandNamesNS5R = {
	0x00: 'Mode Change',
	0x01: 'Map Change',
	0x08: 'Parameter Change',
	0x0e: 'Exclusive Dump Reply',
	0x10: 'Mode Request',
	0x11: 'Map Type Request',
	0x12: 'Part Parameter Change',
	0x20: 'Global Dump Request',
	0x21: 'Current Program Dump Request',
	0x22: 'Current Combination Dump Request',
	0x23: 'Current Drum Kit Dump Request',
	0x24: 'Current Effect Dump Request',
	0x25: 'Current Multi Dump Request',
	0x26: 'All Program Dump Request',
	0x27: 'All Combination Dump Request',
	0x28: 'All User Drum Kit Dump Request',
	0x29: 'All Effect Dump Request',
	0x2a: 'All Multi Part Dump Request',
	0x2b: 'Part Common Params Dump Request',
	0x2c: 'All Part Params Dump Request',
	0x30: 'Global Dump',
	0x31: 'Current Program Dump',
	0x32: 'Current Combination Dump',
	0x33: 'Current Drum Kit Dump',
	0x34: 'Current Effect Dump',
	0x35: 'Current Multi Dump',
	0x36: 'All Program Dump',
	0x37: 'All Combination Dump',
	0x38: 'All User Drum Dump',
	0x39: 'All Effect Dump',
	0x3a: 'All Multi Dump',
	0x3b: 'Part Common Parameter Dump',
	0x3c: 'All Part Parameter Dump',
	0x41: 'Program Write',
	0x42: 'Combination Write',
	0x43: 'Drum Write',
	0x44: 'Effect Write',
	0x45: 'Multi Write',
	0x7d: 'LCD Back Light Color',
	0x7e: 'Remote Switch',
};

const commandNamesN1R = {
	0x00: 'Mode Change',
	0x01: 'Map Change',
	0x08: 'Parameter Change',
	0x0e: 'Exclusive Dump Reply',
	0x10: 'Mode Request',
	0x11: 'Map Type Request',
	0x12: 'Part Parameter Change',
	0x1f: 'Capture LCD Image',
	0x20: 'Global Dump Request',
	0x21: 'Current Program Dump Request',
	0x22: 'Current Combination Dump Request',
	0x23: 'Current Drum Kit Dump Request',
	0x24: 'Current Effect Dump Request',
	0x25: 'Current Performance Dump Request',
	0x26: 'All Program Dump Request',
	0x27: 'All Combination Dump Request',
	0x28: 'All User Drum Kit Dump Request',
	0x29: 'All Effect Dump Request',
	0x2a: 'All Performance Part Dump Request',
	0x30: 'Global Dump',
	0x31: 'Current Program Dump',
	0x32: 'Current Combination Dump',
	0x33: 'Current Drum Kit Dump',
	0x34: 'Current Effect Dump',
	0x35: 'Current Performance Dump',
	0x36: 'All Program Dump',
	0x37: 'All Combination Dump',
	0x38: 'All User Drum Dump',
	0x39: 'All Effect Dump',
	0x3a: 'All Performance Dump',
	0x3b: 'Voice Name Dump',
	0x41: 'Program Write',
	0x42: 'Combination Write',
	0x43: 'Drum Write',
	0x44: 'Program Effect Write',
	0x45: 'Combination Effect Write',
	0x46: 'Performance Write',
	0x7d: 'LCD Back Light Color',
	0x7e: 'Remote Switch',
	0x7f: 'Capture LCD Data',
};

function makeParsers(modelProp) {
	console.assert(modelProp);

	const commandNames = {
		0x12: 'Mode Request',
		0x10: 'Program Parameter Dump Request',
		0x1f: 'Drums Sound Name Dump Request',
		0x16: 'Multi-Sound Name Dump Request',
		0x1c: 'All Program Parameter Dump Request',
		0x19: 'Combination Parameter Dump Request',
		0x1d: 'All Combination Parameter Dump Request',
		0x18: 'All Sequence Data Dump Request',
		0x06: 'Multi Setup Data Dump Request',
		0x33: 'Multi Setup Data (exp.) Dump Request',
		0x0e: 'Global Data Dump Request',
		0x0d: 'Drums Data Dump Request',
		0x0f: 'All Data Dump Request',
		0x15: 'Multi-Sound Parameter Dump Request',
		0x11: 'Program Write Request',
		0x1a: 'Combination Write Request',
		0x40: 'Program Parameter Dump',
		0x4c: 'All Program Parameter Dump',
		0x49: 'Combination Parameter Dump',
		0x4d: 'All Combination Parameter Dump',
		0x48: 'All Sequence Data Dump',
		0x55: 'Multi Setup Data Dump',
		0x68: 'Multi Setup Data (exp.) Dump',
		0x51: 'Global Data Dump',
		0x52: 'Drums Data Dump',
		0x50: 'All Data Dump',
		0x44: 'Multi-Sound Parameter Dump',
		0x4e: 'Mode Change',
		0x41: 'Parameter Change',
		0x53: 'Drum Kit Parameter Change',
		0x47: 'Drums Sound Name',
		0x45: 'Multi-Sound Name',
		0x42: 'Mode Data',
		0x26: 'Received Message Format Error',
		0x23: 'Data Load Completed',
		0x24: 'Data Load Error',
		0x21: 'Write Completed',
		0x22: 'Write Error',
	};

	const modelIdStr = bytesToHex([modelProp.modelId]);

	const parsers = new Map();
	for (const command of modelProp.commands) {
		const commandStr = bytesToHex([command]);

		let regexp, handler;
		switch (command) {
		case 0x12:	// Mode Request
		case 0x10:	// Program Parameter Dump Request
		case 0x19:	// Combination Parameter Dump Request
		case 0x15:	// Multi-Sound Parameter Dump Request
		case 0x26:	// Received Message Format Error
		case 0x23:	// Data Load Completed
		case 0x24:	// Data Load Error
		case 0x21:	// Write Completed
		case 0x22:	// Write Error
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} f7$`, 'u');
			handler = makeHandlerForNoData(modelProp.modelName, commandNames[command], false);
			break;

		case 0x1c:	// All Program Parameter Dump Request
		case 0x1d:	// All Combination Parameter Dump Request
		case 0x18:	// All Sequence Data Dump Request
		case 0x06:	// Multi Setup Data Dump Request
		case 0x33:	// Multi Setup Data (exp) Dump Request
		case 0x0e:	// Global Data Dump Request
		case 0x0d:	// Drums Data Dump Request
		case 0x0f:	// All Data Dump Request
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. f7$`, 'u');
			handler = makeHandlerForNoData(modelProp.modelName, commandNames[command], true);
			break;

		case 0x1f:	// Drums Sound Name Dump Request
		case 0x16:	// Multi-Sound Name Dump Request
			{
				// From T1, those commands require an additional "bank" byte (or 0 as dummy).
				const isAdditionalBank = (modelProp.modelId >= 0x26);	// "0x26" means the model ID of T1.
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} ${(isAdditionalBank) ? '.. ' : ''}f7$`, 'u');
				handler = makeHandlerForNoData(modelProp.modelName, commandNames[command], isAdditionalBank);
			}
			break;

		case 0x40:	// Program Parameter Dump
		case 0x49:	// Combination Parameter Dump
		case 0x68:	// Multi Setup Data (exp) Dump
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} (?:.. )+f7$`, 'u');
			handler = makeHandlerForPackedData(modelProp.modelName, commandNames[command], false);
			break;

		case 0x4c:	// All Program Parameter Dump
		case 0x4d:	// All Combination Parameter Dump
		case 0x55:	// Multi Setup Data Dump
		case 0x51:	// Global Data Dump
		case 0x52:	// Drums Data Dump
		case 0x50:	// All Data Dump
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. (?:.. )+f7$`, 'u');
			handler = makeHandlerForPackedData(modelProp.modelName, commandNames[command], true);
			break;

		case 0x11:	// Program Write Request
		case 0x1a:	// Combination Write Request
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, bankNo, progNo] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, bankNo, progNo};
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x42:	// Mode Data
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} (?:.. ){3,4}f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, modeNo, cardVariation, pcmCardVariation] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, modeNo, cardVariation, pcmCardVariation};
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x4e:	// Mode Change
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, modeNo, bankNo] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, modeNo, bankNo};
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x41:	// Parameter Change
			if (modelProp.modelId === 0x19) {	// M1
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, paramPage, paramPos, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, paramPage, paramPos,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProp.modelName, commandNames[command]);

			} else if (modelProp.modelId === 0x24) {	// M3R
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, paramNo, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, paramNo,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProp.modelName, commandNames[command]);

			} else if (modelProp.modelId === 0x26 || modelProp.modelId === 0x2b) {	// T1, 01/W
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, paramPage, paramStage, paramPos, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, paramPage, paramStage, paramPos,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProp.modelName, commandNames[command]);

			} else if (modelProp.modelId === 0x30 || modelProp.modelId === 0x35 || modelProp.modelId === 0x36) {	// 03R/W, X3, 05R/W
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, pp0, pp1, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName,
						paramNo: makeValueFrom7bits(pp0, pp1),
						value:   makeValueFrom7bits(vv0, vv1),
					};
				})(modelProp.modelName, commandNames[command]);

			} else {
				console.assert(false);
			}
			break;

		case 0x53:	// Drum Kit Parameter Change
			if (modelProp.modelId >= 0x2b) {	// T1, 01/W
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, bankNo, drumKitNo, indexNo, paramNo, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, bankNo, drumKitNo, indexNo, paramNo,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProp.modelName, commandNames[command]);
			} else {	// 03R/W, X3, 05R/W
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} 00 .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, tmp00, indexNo, paramNo, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42 && tmp00 === 0x00);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, indexNo, paramNo,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProp.modelName, commandNames[command]);
			}
			break;

		case 0x47:	// Drums Sound Name
		case 0x45:	// Multi-Sound Name
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. (?:(?:.. ){10})*f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, num, ...payload] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, num, payload};	// TODO: Implement
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x48:	// All Sequence Data Dump
		case 0x44:	// Multi-Sound Parameter Dump
			// TODO: Implement
			break;

		default:
			console.assert(false, 'Unexpected case', {command});
			break;
		}

		const key = `f0 42 30 ${modelIdStr} ${commandStr}`;
		parsers.set(key, {regexp, handler});
	}

	return parsers;
}

function makeParsersN(modelId, commands) {
	console.assert(commands);

	const modelNamesN = {
		0x42: 'NS5R',
		0x4c: 'N1R',
	};

	const modelIdStr = bytesToHex([modelId]);
	const parsers = new Map();
	for (const command of Object.keys(commands)) {
		const commandId = parseInt(command, 10);
		const commandStr = bytesToHex([commandId]);

		let regexp, handler;
		const regexpStr = `f0 42 3. ${modelIdStr} ${commandStr}`;
		switch (commandId) {
//		case 0x2b:	// Voice Name Dump Request	// TODO: Support 0x2b for N1R
		case 0x00:	// Mode Change
		case 0x01:	// Map Change
		case 0x7d:	// LCD Back Light Color
		case 0x7e:	// Remote Switch
			regexp = new RegExp(String.raw`^${regexpStr} .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, value] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, value};
			})(modelNamesN[modelId], commands[command]);
			break;

		case 0x08:	// Parameter Change
			regexp = new RegExp(String.raw`^${regexpStr} .. .. .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, ll, mm, dd, ee] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {
					mfrId, deviceId, modelId, modelName, commandId, commandName,
					paramNo: makeValueFrom7bits(ll, mm),
					value:   makeValueFrom7bits(dd, ee),
				};
			})(modelNamesN[modelId], commands[command]);
			break;

		case 0x0e:	// Exclusive Dump Reply
			regexp = new RegExp(String.raw`^${regexpStr} .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, value, commandNo] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, value, commandNo};
			})(modelNamesN[modelId], commands[command]);
			break;

		case 0x12:	// Part Parameter Change
			regexp = new RegExp(String.raw`^${regexpStr}(?: ..){3}(?: ..)+ f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, ...rest] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);
				const address = rest.slice(0, 3);
				const payload = rest.slice(3);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, address, payload};
			})(modelNamesN[modelId], commands[command]);
			break;

		default:
			if (0x10 <= commandId && commandId <= 0x2f) {
				// Dump Request
				regexp = new RegExp(String.raw`^${regexpStr} f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {mfrId, deviceId, modelId, modelName, commandId, commandName};
				})(modelNamesN[modelId], commands[command]);

			} else if ((commandId & 0xf0) === 0x30 || commandId === 0x7f) {
				// Data Dump / Capture LCD Data
				regexp = new RegExp(String.raw`^${regexpStr}(?: ..)+ f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, ...payload] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);
					const isCheckSumError = checkSumError(payload);
					const checkSum = payload.pop();
					const decodedPayload = convert7to8bits(payload);

					return {mfrId, deviceId, modelId, modelName, commandId, commandName, payload, decodedPayload, checkSum, isCheckSumError};
				})(modelNamesN[modelId], commands[command]);

			} else if ((commandId & 0xf0) === 0x40) {
				// Write Request
				regexp = new RegExp(String.raw`^${regexpStr} .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, progNo] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {mfrId, deviceId, modelId, modelName, commandId, commandName, progNo};
				})(modelNamesN[modelId], commands[command]);

			} else {
				console.assert(false);
				break;
			}
		}

		const key = `f0 42 30 ${modelIdStr} ${commandStr}`;
		parsers.set(key, {regexp, handler});
	}

	return parsers;
}

function makeHandlerForNoData(modelName, commandName) {
	return ((modelName, commandName) => (bytes) => {
		const [mfrId, deviceId, modelId, commandId, bankNo] = stripEnclosure(bytes);
		console.assert(mfrId === 0x42);

		return {
			mfrId, deviceId, modelId, modelName, commandId, commandName,
			bankNo: bankNo || 0,
		};
	})(modelName, commandName);
}

function makeHandlerForPackedData(modelName, commandName, isAdditionalBank) {
	return ((modelName, commandName, isAdditionalBank) => (bytes) => {
		const [mfrId, deviceId, modelId, commandId, ...payload] = stripEnclosure(bytes);
		console.assert(mfrId === 0x42);

		const obj = {mfrId, deviceId, modelId, modelName, commandId, commandName};

		if (isAdditionalBank) {
			obj.bankNo = payload.shift();
		}

		obj.decodedPayload = convert7to8bits(payload);

		return obj;
	})(modelName, commandName, isAdditionalBank);
}

// Add SysEx parsers.
for (const modelProp of modelProps) {
	const parsers = makeParsers(modelProp);
	addSysExParsers(parsers);
}
addSysExParsers(makeParsersN(0x42, commandNamesNS5R));
addSysExParsers(makeParsersN(0x4c, commandNamesN1R));
