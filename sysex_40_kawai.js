import {addSysExParsers, stripEnclosure} from './sysex_instance.js';

const modelNames = {
	0x08: 'GMega/K11',
	0x09: 'GMegaLX/KC20',
	0x0a: 'GMouse/GMCAT',
};

const parsersGMega = new Map([
	// A-1: System Functions
	['f0 40 00 10 00 08 00', {
		regexp: /^f0 40 0. 10 00 08 00 .. 00 0. 0. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, tmp00, dh, dl] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x00 && tmp00 === 0x00);

			return {
				commandName: 'System Functions',
				mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo,
				modelName: modelNames[modelId],
				value: makeValueFromNibbles(dl, dh),
			};
		},
	}],
	// A-2: Section Functions
	['f0 40 00 10 00 08 01', {
		regexp: /^f0 40 0. 10 00 08 01 .. .. 0. 0. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, partNo, dh, dl] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x01);

			return {
				commandName: 'Section Functions',
				mfrId, deviceId, commandId, groupId, modelId, functionId, indexNo, partNo,
				modelName: modelNames[modelId],
				value: makeValueFromNibbles(dl, dh),
			};
		},
	}],
	// A-3: Single Functions
	['f0 40 00 10 00 08 03', {
		regexp: /^f0 40 0. 10 00 08 03 .. .. 0. 0. 0. 0. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, progNo, dh1, dl1, dh2, dl2] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x03);

			return {
				commandName: 'Single Functions',
				mfrId, deviceId, commandId, groupId, modelId, functionId, indexNo, progNo,
				modelName: modelNames[modelId],
				values: [makeValueFromNibbles(dl1, dh1), makeValueFromNibbles(dl2, dh2)],
			};
		},
	}],
	// A-4: Percussion Functions
	['f0 40 00 10 00 08 04', {
		regexp: /^f0 40 0. 10 00 08 04 .. .. 0. 0. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, noteNo, dh, dl] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x04);

			return {
				commandName: 'Section Functions',
				mfrId, deviceId, commandId, groupId, modelId, functionId, indexNo, noteNo,
				modelName: modelNames[modelId],
				value: makeValueFromNibbles(dl, dh),
			};
		},
	}],
	// A-5: System (supported by only K11)
	['f0 40 00 10 00 08 0d', {
		regexp: /^f0 40 0. 10 00 08 0d .. 00 0. 0. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, tmp00, dh, dl] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x0d && tmp00 === 0x00);

			return {
				commandName: 'System',
				mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo,
				modelName: modelNames[modelId],
				value: makeValueFromNibbles(dl, dh),
			};
		},
	}],
	// A-6: Performance Patch Name (supported by only K11)
	['f0 40 00 10 00 08 02 02', {
		regexp: /^f0 40 0. 10 00 08 02 02 .. (?:.. ){8}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, progNo, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x02 && indexNo === 0x02);

			return {
				commandName: 'Performance Patch Name',
				mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, progNo,
				modelName: modelNames[modelId],
				progName: String.fromCharCode(...rest),
			};
		},
	}],
	// B-1: Single Name
	['f0 40 00 10 00 08 02 00', {
		regexp: /^f0 40 0. 10 00 08 02 00 .. (?:.. ){8}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, progNo, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x02 && indexNo === 0x00);

			return {
				commandName: 'Single Name',
				mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, progNo,
				modelName: modelNames[modelId],
				progName: String.fromCharCode(...rest),
			};
		},
	}],
	// B-2: Percussion Name
	['f0 40 00 10 00 08 02 01', {
		regexp: /^f0 40 0. 10 00 08 02 01 .. (?:.. ){8}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, progNo, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x02 && indexNo === 0x01);

			return {
				commandName: 'Percussion Name',
				mfrId, deviceId, functionId, groupId, modelId, commandId, indexNo, progNo,
				modelName: modelNames[modelId],
				progName: String.fromCharCode(...rest),
			};
		},
	}],
	// B-3: Percussion Assign Map
	['f0 40 00 10 00 08 05', {
		regexp: /^f0 40 0. 10 00 08 05 .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, drumNo, noteNo, progNo] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x05);

			return {
				commandName: 'Percussion Assign Map',
				mfrId, deviceId, functionId, groupId, modelId, commandId, drumNo, noteNo, progNo,
				modelName: modelNames[modelId],
			};
		},
	}],
	// C-1: Single 1/2 Source Map
	['f0 40 00 10 00 08 06', {
		regexp: /^f0 40 0. 10 00 08 06 (?:.. ){128}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x06);

			return {
				commandName: 'Percussion Assign Map',
				mfrId, deviceId, functionId, groupId, modelId, commandId, payload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-1: System (Bulk Dump)
	['f0 40 00 10 00 08 07', {
		regexp: /^f0 40 0. 10 00 08 07 (?:0. ){26}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x07);
			const decodedPayload = makeArrayFromNibbles(payload);

			return {
				commandName: 'System (Bulk Dump)',
				mfrId, deviceId, functionId, groupId, modelId, commandId, decodedPayload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-2: Section Functions (Bulk Dump)
	['f0 40 00 10 00 08 08', {
		regexp: /^f0 40 0. 10 00 08 08 .. (?:0. ){38}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, partNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x08);
			const decodedPayload = makeArrayFromNibbles(payload);

			return {
				commandName: 'Section Functions (Bulk Dump)',
				mfrId, deviceId, functionId, groupId, modelId, commandId, partNo, decodedPayload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-3: System Reserved Parameters (Bulk Dump)
	['f0 40 00 10 00 08 0c', {
		regexp: /^f0 40 0. 10 00 08 0c (?:.. ){128}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x0c);

			return {
				commandName: 'System Reserved Parameters (Bulk Dump)',
				mfrId, deviceId, functionId, groupId, modelId, commandId, payload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-4: Single Functions (Bulk Dump)
	['f0 40 00 10 00 08 09', {
		regexp: /^f0 40 0. 10 00 08 09 .. (?:0. ){88}f7$/u,	// TODO: Confirm
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, progNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x09);
			const decodedPayload = makeArrayFromNibbles(payload);

			return {
				commandName: 'Single Functions (Bulk Dump)',
				mfrId, deviceId, functionId, groupId, modelId, commandId, progNo, decodedPayload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-5: Percussion Functions (Bulk Dump)
	['f0 40 00 10 00 08 0a', {
		regexp: /^f0 40 0. 10 00 08 0a .. (?:0. ){52}f7$/u,	// TODO: Confirm
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, progNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x0a);
			const decodedPayload = makeArrayFromNibbles(payload);

			return {
				commandName: 'Percussion Functions (Bulk Dump)',
				mfrId, deviceId, functionId, groupId, modelId, commandId, progNo, decodedPayload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-6: Percussion Assign Map (Bulk Dump)
	['f0 40 00 10 00 08 0b', {
		regexp: /^f0 40 0. 10 00 08 0b .. (?:.. ){128}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, drumNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x0b);

			return {
				commandName: 'Percussion Assign Map (Bulk Dump)',
				mfrId, deviceId, functionId, groupId, modelId, commandId, drumNo, payload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-7: System Functions (Bulk Dump) (supported by only K11)
	['f0 40 00 10 00 08 0e', {
		regexp: /^f0 40 0. 10 00 08 0e (?:.. ){6}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x0e);

			return {
				commandName: 'System Functions',
				mfrId, deviceId, functionId, groupId, modelId, commandId, payload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-8: Performance Patch Data (Bulk Dump) (supported by only K11)
	['f0 40 00 10 00 08 0f', {
		regexp: /^f0 40 0. 10 00 08 0f .. .. (?:.. ){48}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, progNo, partNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x0f);

			return {
				commandName: 'Performance Patch Data (Bulk Dump)',
				mfrId, deviceId, functionId, groupId, modelId, commandId, progNo, partNo, payload,
				modelName: modelNames[modelId],
			};
		},
	}],
	// D-9: Performance Patch Name (Bulk Dump) (supported by only K11)
	['f0 40 00 10 00 08 10', {
		regexp: /^f0 40 0. 10 00 08 10 .. (?:.. ){8}f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, functionId, groupId, modelId, commandId, progNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x40 && functionId === 0x10 && groupId === 0x00 && modelId === 0x08 && commandId === 0x10);

			return {
				commandName: 'Performance Patch Name (Bulk Dump)',
				mfrId, deviceId, functionId, groupId, modelId, commandId, progNo, payload,
				modelName: modelNames[modelId],
				progName: String.fromCharCode(...payload),
			};
		},
	}],
]);

function makeValueFromNibbles(l, h) {
	return (h & 0x0f) << 4 | (l & 0x0f);
}

function makeArrayFromNibbles(nibbles) {
	return nibbles.reduce((p, c, i) => {
		if (i % 2 === 0) {
			p.push(makeValueFromNibbles(c[1], c[0]));
		}
		return p;
	}, []);
}

// Add SysEx parsers.
addSysExParsers(parsersGMega);
