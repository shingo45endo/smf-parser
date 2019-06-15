import {varNum} from './smf_parser.js';

const parsers = {
	0x00: {
		name: 'Sequence Number',
		handler: (payload) => {
			console.assert(payload && 'length' in payload);
			if (payload.length !== 2) {
				return null;
			}
			return {
				sequenceNo: (payload[0] << 8) | payload[1],
			};
		},
	},
	0x01: {
		name: 'Text Event',
		handler: handleTextEvent,
	},
	0x02: {
		name: 'Copyright Notice',
		handler: handleTextEvent,
	},
	0x03: {
		name: 'Sequence / Track Name',
		handler: handleTextEvent,
	},
	0x04: {
		name: 'Instrument Name',
		handler: handleTextEvent,
	},
	0x05: {
		name: 'Lyric',
		handler: handleTextEvent,
	},
	0x06: {
		name: 'Marker',
		handler: handleTextEvent,
	},
	0x07: {
		name: 'Cue Point',
		handler: handleTextEvent,
	},
	0x20: {
		name: 'MIDI Channel Prefix',
		handler: (payload) => {
			console.assert(payload && 'length' in payload);
			if (payload.length !== 1) {
				return null;
			}
			return {
				channelNo: payload[0],
			};
		},
	},
	0x21: {
		name: '(MIDI Port Prefix)',
		handler: (payload) => {
			console.assert(payload && 'length' in payload);
			if (payload.length !== 1) {
				return null;
			}
			return {
				portNo: payload[0],
			};
		},
	},
	0x2f: {
		name: 'End of Track',
		handler: () => ({}),
	},
	0x51: {
		name: 'Set Tempo',
		handler: (payload) => {
			console.assert(payload && 'length' in payload);
			if (payload.length !== 3) {
				return null;
			}
			const usecPerBeat = (payload[0] << 16) | (payload[1] << 8) | payload[2];
			return {
				usecPerBeat,
				tempo: 60 * 1000 * 1000 / usecPerBeat,
			};
		},
	},
	0x52: {
		name: 'SMPTE Offset',
		handler: (payload) => {
			console.assert(payload && 'length' in payload);
			if (payload.length !== 5) {
				return null;
			}
			return {
				hoursAndType:     payload[0],
				minutes:          payload[1],
				seconds:          payload[2],
				frames:           payload[3],
				fractionalFrames: payload[4],
			};
		},
	},
	0x58: {
		name: 'Time Signature',
		handler: (payload) => {
			console.assert(payload && 'length' in payload);
			if (payload.length !== 4) {
				return null;
			}
			return {
				numerator:     payload[0],
				denominator:   2 ** payload[1],
				numMidiClocks: payload[2],
				num32ndNotes:  payload[3],
			};
		},
	},
	0x59: {
		name: 'Key Signature',
		handler: (payload) => {
			console.assert(payload && 'length' in payload);
			if (payload.length !== 2) {
				return null;
			}
			return {
				sharpFlats: payload[0],
				majorMinor: payload[1],
			};
		},
	},
	0x7f: {
		name: 'Sequencer-Specific Meta-Event',
		handler: (payload) => {
			console.assert(payload && 'length' in payload);
			// TODO: Implement Sequencer-Specific Meta-Event parser.
			return {};
		},
	},
};

const decodeText = (() => {
	const utf8Decoder = new TextDecoder('UTF-8');

	return (payload) => {
		console.assert(payload && 'length' in payload);

		const utf8Text = utf8Decoder.decode(payload);
		if (!utf8Text.includes('\ufffd')) {
			return utf8Text;
		}

		// TODO: Implement decoders for the other character codes.
		return [...payload].map((e) => (e < 0x80) ? String.fromCharCode(e) : `\\x${e.toString(16)}`).join('');
	};
})();

function handleTextEvent(payload) {
	console.assert(payload && 'length' in payload);
	return {
		text: decodeText(payload),
	};
}

export function analyzeMetaEvent(bytes) {
	console.assert(bytes && bytes.length);

	if (bytes.length < 3 || bytes[0] !== 0xff) {
		return null;
	}

	const eventId = bytes[1];
	const [len, skip] = varNum(bytes, 2);
	const payload = bytes.slice(2 + skip);
	if (payload.length !== len) {
		return null;
	}
	const parser = parsers[eventId];

	const mes = {
		kind: 'ff',
		eventId, payload,
		eventName: (parser) ? parsers[eventId].name : 'Unknown Event',
	};

	if (parser && parser.handler) {
		Object.assign(mes, parser.handler(payload));
	}

	return mes;
}
