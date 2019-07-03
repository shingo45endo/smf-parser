import {addSysExParsers, bytesToHex, stripEnclosure, makeValueFrom7bits} from './sysex_instance.js';

const modelProps = new Map([
	// M1, M1R
	[0x19, {
		name: 'M1',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x18, 0x0e, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x48, 0x51, 0x50, 0x4e, 0x41, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	}],
	// M3R
	[0x24, {
		name: 'M3R',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	}],
	// T1/T2/T3
	[0x26, {
		name: 'T1',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x18, 0x0e, 0x0f, 0x15, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x48, 0x51, 0x50, 0x44, 0x4e, 0x41, 0x53, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	}],
	// 01/W, 01R/W
	[0x2b, {
		name: '01/W',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x18, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x48, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x53, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	}],
	// 03R/W
	[0x30, {
		name: '03R/W',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x06, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x55, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x53, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	}],
	// AG-10
	[0x34, {
		name: 'AG-10',
		commands: [0x40],
	}],
	// X3, X2, N264/364
	[0x35, {
		name: 'X3',
		commands: [0x12, 0x10, 0x1f, 0x16, 0x1c, 0x19, 0x1d, 0x18, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x48, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x53, 0x47, 0x45, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	}],
	// 05R/W, X5, X5D, X5DR
	[0x36, {
		name: '05R/W',
		// Note that the commands 0x33 and 0x68 (for expansion of Multi data) are not available for 05R/W.
		// But, they (05R/W and X5*) have the same model ID (== 0x36) so they cannot be distinguished each other.
		commands: [0x12, 0x10, 0x1c, 0x19, 0x1d, 0x06, 0x33, 0x0e, 0x0d, 0x0f, 0x11, 0x1a, 0x40, 0x4c, 0x49, 0x4d, 0x55, 0x68, 0x51, 0x52, 0x50, 0x4e, 0x41, 0x53, 0x42, 0x26, 0x23, 0x24, 0x21, 0x22],
	}],
]);

function makeParsers(modelId, modelProps) {
	console.assert(modelProps);

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

	const modelIdStr = bytesToHex([modelId]);

	const parsers = new Map();
	for (const command of modelProps.commands) {
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
			handler = makeHandlerForNoData(modelProps.name, commandNames[command], false);
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
			handler = makeHandlerForNoData(modelProps.name, commandNames[command], true);
			break;

		case 0x1f:	// Drums Sound Name Dump Request
		case 0x16:	// Multi-Sound Name Dump Request
			{
				// From T1, those commands require an additional "bank" byte (or 0 as dummy).
				const isAdditionalBank = (modelId >= 0x26);	// "0x26" means the model ID of T1.
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} ${(isAdditionalBank) ? '.. ' : ''}f7$`, 'u');
				handler = makeHandlerForNoData(modelProps.name, commandNames[command], isAdditionalBank);
			}
			break;

		case 0x40:	// Program Parameter Dump
		case 0x49:	// Combination Parameter Dump
		case 0x68:	// Multi Setup Data (exp) Dump
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} (?:.. )+f7$`, 'u');
			handler = makeHandlerForPackedData(modelProps.name, commandNames[command], false);
			break;

		case 0x4c:	// All Program Parameter Dump
		case 0x4d:	// All Combination Parameter Dump
		case 0x55:	// Multi Setup Data Dump
		case 0x51:	// Global Data Dump
		case 0x52:	// Drums Data Dump
		case 0x50:	// All Data Dump
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. (?:.. )+f7$`, 'u');
			handler = makeHandlerForPackedData(modelProps.name, commandNames[command], true);
			break;

		case 0x11:	// Program Write Request
		case 0x1a:	// Combination Write Request
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, bankNo, progNo] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, bankNo, progNo};
			})(modelProps.name, commandNames[command]);
			break;

		case 0x42:	// Mode Data
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} (?:.. ){3,4}f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, modeNo, cardVariation, pcmCardVariation] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, modeNo, cardVariation, pcmCardVariation};
			})(modelProps.name, commandNames[command]);
			break;

		case 0x4e:	// Mode Change
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, modeNo, bankNo] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, modeNo, bankNo};
			})(modelProps.name, commandNames[command]);
			break;

		case 0x41:	// Parameter Change
			if (modelId === 0x19) {	// M1
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, paramPage, paramPos, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, paramPage, paramPos,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProps.name, commandNames[command]);

			} else if (modelId === 0x24) {	// M3R
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, paramNo, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, paramNo,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProps.name, commandNames[command]);

			} else if (modelId === 0x26 || modelId === 0x2b) {	// T1, 01/W
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, paramPage, paramStage, paramPos, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, paramPage, paramStage, paramPos,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProps.name, commandNames[command]);

			} else if (modelId === 0x30 || modelId === 0x35 || modelId === 0x36) {	// 03R/W, X3, 05R/W
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, pp0, pp1, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName,
						paramNo: makeValueFrom7bits(pp0, pp1),
						value:   makeValueFrom7bits(vv0, vv1),
					};
				})(modelProps.name, commandNames[command]);

			} else {
				console.assert(false);
			}
			break;

		case 0x53:	// Drum Kit Parameter Change
			if (modelId >= 0x2b) {	// T1, 01/W
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. .. .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, bankNo, drumKitNo, indexNo, paramNo, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, bankNo, drumKitNo, indexNo, paramNo,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProps.name, commandNames[command]);
			} else {	// 03R/W, X3, 05R/W
				regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} 00 .. .. .. .. f7$`, 'u');
				handler = ((modelName, commandName) => (bytes) => {
					const [mfrId, deviceId, modelId, commandId, tmp00, indexNo, paramNo, vv0, vv1] = stripEnclosure(bytes);
					console.assert(mfrId === 0x42 && tmp00 === 0x00);

					return {
						mfrId, deviceId, modelId, modelName, commandId, commandName, indexNo, paramNo,
						value: makeValueFrom7bits(vv0, vv1),
					};
				})(modelProps.name, commandNames[command]);
			}
			break;

		case 0x47:	// Drums Sound Name
		case 0x45:	// Multi-Sound Name
			regexp = new RegExp(String.raw`^f0 42 3. ${modelIdStr} ${commandStr} .. (?:(?:.. ){10})*f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId, num, ...payload] = stripEnclosure(bytes);
				console.assert(mfrId === 0x42);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName, num, payload};	// TODO: Implement
			})(modelProps.name, commandNames[command]);
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

		obj.decodedPayload = convert7to8(payload);

		return obj;
	})(modelName, commandName, isAdditionalBank);
}

function convert7to8(payload) {
	console.assert(payload && payload.length > 0);

	const packets = payload.reduce((p, _, i, a) => {
		if (i % 8 === 0) {
			p.push(a.slice(i, i + 8));
		}
		return p;
	}, []);
	const data = packets.reduce((p, c) => {
		const msbs = c.shift();
		const bytes = c.map((e, i) => e | (msbs & (1 << i)));
		p.push(...bytes);
		return p;
	}, []);

	return data;
}

// Add SysEx parsers.
for (const model of modelProps) {
	const parsers = makeParsers(...model);
	addSysExParsers(parsers);
}
