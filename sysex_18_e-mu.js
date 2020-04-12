import {addSysExParsers, bytesToHex, stripEnclosure, makeValueFrom7bits, splitArrayByN} from './sysex_common.js';

const modelProps = [
	// Proteus 1/2/3, XR, Classic Keys
	{
		modelId: 0x04,
		modelName: 'Proteus',
		commands: [
			0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x12, 0x13,
		],
	},
	// SoundEngine
	{
		modelId: 0x04,
		modelName: 'SoundEngine',
		commands: [
//			0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x12, 0x13,
			0x14, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23,
		],
	},
	// Vintage Keys, Orbit, Planet Phat, Carnaval
	{
		modelId: 0x0a,
		modelName: 'Vintage Keys',
		commands: [
			0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x12, 0x13,
			0x30, 0x31, 0x32, 0x33,
		],
	},
	// Morpheus, UltraProteus
	{
		modelId: 0x0c,
		modelName: 'Morpheus',
		commands: [
			0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x12, 0x13,
			0x44, 0x45, 0x46, 0x47, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57,
		],
	},
];

function makeParsers(modelProp) {
	console.assert(modelProp);

	const commandNames = {
		0x00: 'Preset Data Request',
		0x01: 'Preset Data',
		0x02: 'Parameter Value Request',
		0x03: 'Parameter Value',
		0x04: 'Tuning Table Request',
		0x05: 'Tuning Table Data',
		0x06: 'Program Map Request',
		0x07: 'Program Map Data',
		0x08: 'Master Setting Request',
		0x0a: 'Version Request',
		0x0b: 'Version Data',
		0x0c: 'Configuration Request',
		0x0d: 'Configuration Message',
		0x0e: 'Instrument List Request',
		0x0f: 'Instrument List',
		0x12: 'Preset List Request',
		0x13: 'Preset List',

		0x14: 'Master Volume Set',
		0x16: 'Master Volume Request',
		0x17: 'Front Panel Request',
		0x18: 'Front Panel Data',
		0x19: 'Switch Press',
		0x1a: 'Current Bank Request',
		0x1b: 'Bank Select',
		0x1c: 'Option Status',
		0x1d: 'Set Option Status',
		0x1e: 'Read Min Voices',
		0x1f: 'Set Min Voices',
		0x20: 'Read Max Voices',
		0x21: 'Set Max Voices',
		0x22: 'Save Edit Buffer',
		0x23: 'System Reset',

		0x30: 'User Beat Data Request',
		0x31: 'Set User Beat Data',
		0x32: 'Song Beat Data Request',
		0x33: 'Set Song Beat Data',

		0x44: 'Hyperpreset Request',
		0x45: 'Hyperpreset Data',
		0x46: 'Midimap Request',
		0x47: 'Midimap Data',
		0x50: 'Hyperpreset List Request',
		0x51: 'Hyperpreset List Data',
		0x52: 'Midimap List Request',
		0x53: 'Midimap List Data',
		0x54: 'Effect List Request',
		0x55: 'Effect List Data',
		0x56: 'Filter List Request',
		0x57: 'Filter List Data',
	};

	const modelIdStr = bytesToHex([modelProp.modelId]);

	const parsers = [];
	for (const command of modelProp.commands) {
		const commandStr = bytesToHex([command]);

		let regexp, handler;
		switch (command) {
		case 0x04:	// Tuning Table Request
		case 0x06:	// Program Map Request
		case 0x08:	// Master Setting Request
		case 0x0a:	// Version Request
		case 0x0c:	// Configuration Request
		case 0x0e:	// Instrument List Request
		case 0x12:	// Preset List Request
		case 0x14:	// Master Volume Set
		case 0x16:	// Master Volume Request
		case 0x17:	// Front Panel Request
		case 0x19:	// Switch Press
		case 0x1a:	// Current Bank Request
		case 0x1b:	// Bank Select
		case 0x23:	// System Reset
		case 0x50:	// Hyperpreset List Request
		case 0x52:	// Midimap List Request
		case 0x54:	// Effect List Request
		case 0x56:	// Filter List Request
			// No parameter and optional 1-byte value
			regexp = new RegExp(String.raw`^f0 18 ${modelIdStr} .. ${commandStr} (?:.. )?f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, modelId, deviceId, commandId, value] = stripEnclosure(bytes);
				console.assert(mfrId === 0x18);

				return Object.assign({
					mfrId, deviceId, modelId, modelName, commandId, commandName,
				}, (value !== undefined) ? value : {});
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x00:	// Preset Data Request
		case 0x02:	// Parameter Value Request
		case 0x03:	// Parameter Value
		case 0x22:	// Save Edit Buffer
		case 0x30:	// User Beat Data Request
		case 0x32:	// Song Beat Data Request
		case 0x44:	// Hyperpreset Request
		case 0x46:	// Midimap Request
			// 2-byte paramter and optional 2-byte value
			regexp = new RegExp(String.raw`^f0 18 ${modelIdStr} .. ${commandStr} .. .. (?:.. .. )?f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, modelId, deviceId, commandId, paramL, paramM, valueL, valueM] = stripEnclosure(bytes);
				console.assert(mfrId === 0x18);

				return Object.assign({
					mfrId, deviceId, modelId, modelName, commandId, commandName,
					param: makeSignedValueFrom14bit(paramL, paramM),
				}, (valueL !== undefined && valueM !== undefined) ? {
					value: makeSignedValueFrom14bit(valueL, valueM),
				} : {});
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x01:	// Preset Data
			// 2-byte paramter, a sequence of 2-byte values and a checksum
			regexp = new RegExp(String.raw`^f0 18 ${modelIdStr} .. ${commandStr} .. .. (?:.. .. )+.. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, modelId, deviceId, commandId, paramL, paramM, ...rest] = stripEnclosure(bytes);
				console.assert(mfrId === 0x18);
				const checkSum = rest.pop();
				const isCheckSumError = (rest.reduce((p, c) => p + c) % 0x80 !== checkSum);
				const values = splitArrayByN(rest, 2).map((e) => makeSignedValueFrom14bit(...e));

				return {
					mfrId, deviceId, modelId, modelName, commandId, commandName, checkSum, isCheckSumError, values,
					param: makeSignedValueFrom14bit(paramL, paramM),
				};
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x1c:	// Option Status
		case 0x1d:	// Set Option Status
			// 1-byte paramter and optional 1-byte value
			regexp = new RegExp(String.raw`^f0 18 ${modelIdStr} .. ${commandStr} .. (?:.. )?f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, modelId, deviceId, commandId, param, value] = stripEnclosure(bytes);
				console.assert(mfrId === 0x18);

				return Object.assign({
					mfrId, deviceId, modelId, modelName, commandId, commandName, param,
				}, (value !== undefined) ? value : {});
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x1e:	// Read Min Voices
		case 0x1f:	// Set Min Voices
		case 0x20:	// Read Max Voices
		case 0x21:	// Set Max Voices
			// Channel No. and optional 1-byte value
			regexp = new RegExp(String.raw`^f0 18 ${modelIdStr} .. ${commandStr} .. (?:.. )?f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, modelId, deviceId, commandId, partNo, value] = stripEnclosure(bytes);
				console.assert(mfrId === 0x18);

				return Object.assign({
					mfrId, deviceId, modelId, modelName, commandId, commandName, channelNo: partNo,
				}, (value !== undefined) ? value : {});
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x18:	// Front Panel Data
			// 32 ASCII characters and two status bytes
			regexp = new RegExp(String.raw`^f0 18 ${modelIdStr} .. ${commandStr} (?:.. ){32}.. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, modelId, deviceId, commandId, ...rest] = stripEnclosure(bytes);
				console.assert(mfrId === 0x18);
				const ledStatusBits = rest.pop();
				const ledCursorPos  = rest.pop();

				return {
					mfrId, deviceId, modelId, modelName, commandId, commandName, ledStatusBits, ledCursorPos,
					value: String.fromCharCode(...rest),
				};
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x45:	// Hyperpreset Data
		case 0x47:	// Midimap Data
			// Data version and 2-byte value
			regexp = new RegExp(String.raw`^f0 18 ${modelIdStr} .. ${commandStr} .. .. .. f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, modelId, deviceId, commandId, version, valueL, valueM] = stripEnclosure(bytes);
				console.assert(mfrId === 0x18);

				return {
					mfrId, deviceId, modelId, modelName, commandId, commandName, version,
					value: makeSignedValueFrom14bit(valueL, valueM),
				};
			})(modelProp.modelName, commandNames[command]);
			break;

		case 0x05:	// Tuning Table Data
		case 0x07:	// Program Map Data
		case 0x0b:	// Version Data
		case 0x0d:	// Configuration Message
		case 0x0f:	// Instrument List
		case 0x13:	// Preset List
		case 0x31:	// Set User Beat Data
		case 0x33:	// Set Song Beat Data
		case 0x51:	// Hyperpreset List Data
		case 0x53:	// Midimap List Data
		case 0x55:	// Effect List Data
		case 0x57:	// Filter List Data
			// TODO: Implement respective parsers for each command.
			regexp = new RegExp(String.raw`^f0 18 ${modelIdStr} .. ${commandStr} (?:.. )+f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, modelId, deviceId, commandId, ...payload] = stripEnclosure(bytes);
				console.assert(mfrId === 0x18);

				return {
					mfrId, deviceId, modelId, modelName, commandId, commandName, payload,
				};
			})(modelProp.modelName, commandNames[command]);
			break;

		default:
			console.assert(false, 'Unexpected case', {command});
			break;
		}

		const key = `f0 18 ${modelIdStr} 00 ${commandStr}`;
		parsers.push([key, {regexp, handler}]);
	}

	return parsers;
}

function makeSignedValueFrom14bit(ll, mm) {
	const rawValue = makeValueFrom7bits(ll, mm);
	return (rawValue < 0x2000) ? rawValue : 0x4000 - rawValue;
}

// Add SysEx parsers.
for (const modelProp of modelProps) {
	const parsers = makeParsers(modelProp);
	addSysExParsers(parsers);
}
