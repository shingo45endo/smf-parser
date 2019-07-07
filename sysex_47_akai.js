import {addSysExParsers, stripEnclosure} from './sysex_instance.js';

const parsers = new Map([
	// Request Bulk Dump
	['f0 47 10 00 5d', {
		regexp: /^f0 47 10 00 5d .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, commandId, modelId, bankNo, progNo] = stripEnclosure(bytes);
			console.assert(mfrId === 0x44 && deviceId === 0x10 && commandId === 0x00 && modelId === 0x5d);

			return {
				commandName: 'Request Bulk Dump',
				modelName: 'SG01',
				mfrId, deviceId, commandId, modelId, bankNo, progNo,
			};
		},
	}],
	// Bulk Dump Data Set
	['f0 47 10 01 5d', {
		regexp: /^f0 47 10 01 5d .. ..(?: ..){5} f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, commandId, modelId, bankNo, progNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x44 && deviceId === 0x10 && commandId === 0x01 && modelId === 0x5d);

			return {
				commandName: 'Bulk Dump Data Set',
				modelName: 'SG01',
				mfrId, deviceId, commandId, modelId, bankNo, progNo, payload,
			};
		},
	}],
	// Data Set
	['f0 47 10 42 5d', {
		regexp: /^f0 47 10 42 5d(?: ..){3}(?: ..)+ f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, commandId, modelId, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x44 && deviceId === 0x10 && commandId === 0x42 && modelId === 0x5d);
			const address = rest.slice(0, 4);
			const payload = rest.slice(4);

			return {
				commandName: 'Data Set',
				modelName: 'SG01',
				mfrId, deviceId, commandId, modelId, address, payload,
			};
		},
	}],
]);

addSysExParsers(parsers);
