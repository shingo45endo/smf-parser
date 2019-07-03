import {bytesToHex} from './sysex_instance.js';

const parsers = [
	// YAMAHA XF: XF Version ID
	{
		regexp: /^43 7b 00 .. .. .. .. .. ..$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 9);
			const [mfrId, formatId, eventId, id0, id1, id2, id3, ...payload] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x00 && payload.length === 2);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'XF Version ID',
				mfrId, formatId, eventId, payload,
				versionId: String.fromCharCode(id0, id1, id2, id3),
				isXfHeaderPresent:  ((payload[1] & 0x01) !== 0),
				isLyricPresent:     ((payload[1] & 0x08) !== 0),
				isXfKaraokePresent: ((payload[1] & 0x10) !== 0),
				isXfStylePresent:   ((payload[1] & 0x02) !== 0),
			};
		},
	},
	// YAMAHA XF: Chord Name
	{
		regexp: /^43 7b 01 .. .. .. ..$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 7);
			const [mfrId, formatId, eventId, chordRoot, chordType, onBassNote, bassChord] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x01);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Chord Name',
				mfrId, formatId, eventId, chordRoot, chordType, onBassNote, bassChord,
			};
		},
	},
	// YAMAHA XF: Rehearsal Mark
	{
		regexp: /^43 7b 02 ..$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 4);
			const [mfrId, formatId, eventId, rehearsalMark] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x02);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Phrase Mark',
				mfrId, formatId, eventId, rehearsalMark,
			};
		},
	},
	// YAMAHA XF: Phrase Mark
	{
		regexp: /^43 7b 03 .. ..$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 5);
			const [mfrId, formatId, eventId, phraseMark, phraseMarkLevel] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x03);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Phrase Mark',
				mfrId, formatId, eventId, phraseMark, phraseMarkLevel,
			};
		},
	},
	// YAMAHA XF: Max Level 8 Phrase Mark
	{
		regexp: /^43 7b 04 ..$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 4);
			const [mfrId, formatId, eventId, maxPhraseMark] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x04);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Max Level 8 Phrase Mark',
				mfrId, formatId, eventId, maxPhraseMark,
			};
		},
	},
	// YAMAHA XF: Fingering Number
	{
		regexp: /^43 7b 05 .. .. ..$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 6);
			const [mfrId, formatId, eventId, cc, noteName, ff] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x05);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Fingering Number',
				mfrId, formatId, eventId, noteName,
				chNo:       cc & 0x1f,
				isMulti:    ((cc & 0x20) !== 0),
				fingerNo:   ff & 0x07,
				isLeftHand: ((ff & 0x08) !== 0),
			};
		},
	},
	// YAMAHA XF: Guide Track Flag
	{
		regexp: /^43 7b 0c .. ..$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 5);
			const [mfrId, formatId, eventId, melodyTrack1ChNo, melodyTrack2ChNo] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x0c);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Guide Track Flag',
				mfrId, formatId, eventId, melodyTrack1ChNo, melodyTrack2ChNo,
			};
		},
	},
	// YAMAHA XF: Information Flag for Gt
	{
		regexp: /^43 7b 10 .. .. ..(?: ..)+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length > 6);
			const [mfrId, formatId, eventId, xx, applicablePart, capoLocation, ...noteNos] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x10);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Information Flag for Gt',
				mfrId, formatId, eventId, applicablePart, capoLocation, noteNos,
				firstChNo: xx & 0x1f,
				isCommon:  ((xx & 0x20) !== 0),
			};
		},
	},
	// YAMAHA XF: Chord Voicing for Gt
	{
		regexp: /^43 7b 12 ..(?: .. ..)+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length > 4);
			const [mfrId, formatId, eventId, xx, ...payload] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x12 && payload.length % 2 === 0);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Chord Voicing for Gt',
				mfrId, formatId, eventId, payload,
				chNo:      xx & 0x1f,
				isCommon:  ((xx & 0x20) !== 0),
			};
		},
	},
	// YAMAHA XF: Lyrics Bitmap (non-standard?)
	{
		regexp: /^43 7b 21 00 ..(?: ..)+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length >= 5);
			const [mfrId, formatId, eventId, _, displayPattern, ...rest] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x7b && eventId === 0x21);
			const pathName = String.fromCharCode(...rest);

			return {
				commandName:    'YAMAHA XF',
				subCommandName: 'Lyrics Bitmap',
				mfrId, formatId, eventId, displayPattern, pathName,
			};
		},
	},

	// YAMAHA: Score Start Bar
	{
		regexp: /^43 73 0a 00 07 ..+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 6);
			const [mfrId, formatId, eventId, tmp00, tmp07, scoreStartBar] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0a && tmp00 === 0x00 && tmp07 === 0x07);

			return {
				commandName:    'YAMAHA Meta Event',
				subCommandName: 'Score Start Bar',
				mfrId, formatId, eventId, scoreStartBar,
			};
		},
	},
	// YAMAHA: Keyboard Voice
	{
		regexp: /^43 73 0d 01(?: ..)+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length >= 5);
			const [mfrId, formatId, eventId, tmp01, ...payload] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0d && tmp01 === 0x01);

			return {
				commandName:    'YAMAHA Meta Event',
				subCommandName: 'Keyboard Voice',
				mfrId, formatId, eventId, payload,
			};
		},
	},

	// Microsoft: Dual-Mode Mark for Windows MIDI Mapper
	{
		regexp: /^00 00 41$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 3);
			const mfrId = [...bytes];

			return {
				commandName: 'Dual-Mode Mark for Windows MIDI Mapper',
				mfrId,
			};
		},
	},
];

export function analyzeSequencerEvent(bytes) {
	const hexStr = bytesToHex(bytes);
	for (const parser of parsers) {
		if (parser.regexp.test(hexStr)) {
			return parser.handler(bytes);
		}
	}

	return {commandName: 'Unknown'};
}