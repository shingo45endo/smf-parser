import {addSysExParsers, stripEnclosure} from './sysex_common.js';

const parsers = new Map([
	// Data Set 1
	['f0 55 10 42 12', {
		regexp: /^f0 55 10 42 12(?: ..){3}(?: ..)+ f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, modelId, commandId, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x55 && deviceId === 0x10 && modelId === 0x42 && commandId === 0x12);
			const address = rest.slice(0, 3);
			const payload = rest.slice(3);

			return {
				commandName: 'Data Set 1',
				modelName: 'BH-1000',
				mfrId, deviceId, commandId, modelId, address, payload,
			};
		},
	}],
]);

addSysExParsers(parsers);
