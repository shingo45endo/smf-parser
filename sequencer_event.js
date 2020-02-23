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
				commandName:    'XF',
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
				commandName:    'XF',
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
				commandName:    'XF',
				subCommandName: 'Rehearsal Mark',
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
				commandName:    'XF',
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
				commandName:    'XF',
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
				commandName:    'XF',
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
				commandName:    'XF',
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
				commandName:    'XF',
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
				commandName:    'XF',
				subCommandName: 'Chord Voicing for Gt',
				mfrId, formatId, eventId, payload,
				chNo:     xx & 0x1f,
				isCommon: ((xx & 0x20) !== 0),
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
				commandName:    'XF',
				subCommandName: 'Lyrics Bitmap',
				mfrId, formatId, eventId, displayPattern, pathName,
			};
		},
	},

	// YAMAHA Song Meta Event: Start Bar
	{
		regexp: /^43 73 0a 00 04 ..+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 6);
			const [mfrId, formatId, eventId, tmp00, commandId, startBar] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0a && tmp00 === 0x00 && commandId === 0x04);

			return {
				commandName:    'Song Meta Event',
				subCommandName: 'Start Bar',
				mfrId, formatId, eventId, commandId, startBar,
			};
		},
	},
	// YAMAHA Song Meta Event: Track Information
	{
		regexp: /^43 73 0a 00 05(?: ..){16}$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 21);
			const [mfrId, formatId, eventId, tmp00, commandId, ...rest] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0a && tmp00 === 0x00 && commandId === 0x05);
			const trackStrs = rest.map((e) => String.fromCharCode(e));

			return {
				commandName:    'Song Meta Event',
				subCommandName: 'Track Information',
				mfrId, formatId, eventId, commandId, trackStrs,
			};
		},
	},
	// YAMAHA Song Meta Event: Offset Volume
	{
		regexp: /^43 73 0a 00 06(?: ..){16}$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 21);
			const [mfrId, formatId, eventId, tmp00, commandId, ...offsetVolumes] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0a && tmp00 === 0x00 && commandId === 0x06);

			return {
				commandName:    'Song Meta Event',
				subCommandName: 'Offset Volume',
				mfrId, formatId, eventId, commandId, offsetVolumes,
			};
		},
	},
	// YAMAHA Song Meta Event: Score Offset Measure
	{
		regexp: /^43 73 0a 00 07 ..+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 6);
			const [mfrId, formatId, eventId, tmp00, commandId, startBar] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0a && tmp00 === 0x00 && commandId === 0x07);

			return {
				commandName:    'Song Meta Event',
				subCommandName: 'Score Offset Measure',
				mfrId, formatId, eventId, commandId, startBar,
			};
		},
	},
	// YAMAHA Song Meta Event: Style Name
	{
		regexp: /^43 73 0c 00(?: ..)+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length >= 5);
			const [mfrId, formatId, eventId, tmp00, ...rest] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0c && tmp00 === 0x00);
			const styleName = String.fromCharCode(...rest);

			return {
				commandName:    'Song Meta Event',
				subCommandName: 'Style Name',
				mfrId, formatId, eventId, styleName,
			};
		},
	},
	// YAMAHA Song Meta Event: Song OTS
	{
		regexp: /^43 73 0d 00(?: ..)+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length >= 5);
			const [mfrId, formatId, eventId, tmp00, ...payload] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0d && tmp00 === 0x00);

			return {
				commandName:    'Song Meta Event',
				subCommandName: 'Song OTS',
				mfrId, formatId, eventId, payload,
			};
		},
	},
	// YAMAHA Song Meta Event: Keyboard Voice
	{
		regexp: /^43 73 0d 01(?: ..)+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length >= 5);
			const [mfrId, formatId, eventId, tmp01, ...payload] = bytes;
			console.assert(mfrId === 0x43 && formatId === 0x73 && eventId === 0x0d && tmp01 === 0x01);

			return {
				commandName:    'Song Meta Event',
				subCommandName: 'Keyboard Voice',
				mfrId, formatId, eventId, payload,
			};
		},
	},

	// YAMAHA: MIDI Port Prefix (undocumented?)
	{
		regexp: /^43 00 01 ..+$/u,
		handler: (bytes) => {
			console.assert(bytes && bytes.length === 4);
			const [mfrId, tmp00, tmp01, portNo] = bytes;
			console.assert(mfrId === 0x43 && tmp00 === 0x00 && tmp01 === 0x01);

			return {
				commandName: 'MIDI Port Prefix',
				mfrId, portNo,
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
	if (!bytes || !bytes.length) {
		return null;
	}

	const hexStr = bytesToHex(bytes);
	const result = {hexStr, commandName: 'Unknown'};
	for (const parser of parsers) {
		if (parser.regexp.test(hexStr)) {
			Object.assign(result, parser.handler(bytes));
			break;
		}
	}

	return result;
}
