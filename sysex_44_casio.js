import {addSysExParsers, stripEnclosure} from './sysex_common.js';

const parsers = [
	['f0 44 0b 09', {
		regexp: /^f0 44 0b 09 .. f7$/u,
		handler: (bytes) => {
			const [mfrId, tmp0b, tmp09, value] = stripEnclosure(bytes);
			console.assert(mfrId === 0x44 && tmp0b === 0x0b && tmp09 === 0x09);

			return {
				commandName: 'Effect Change',
				modelName: 'GZ-50M',
				mfrId, value,
			};
		},
	}],
];

addSysExParsers(parsers);
