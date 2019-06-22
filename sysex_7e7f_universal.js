import {addSysExParsers, stripEnclosure, checkSumError} from './sysex_instance.js';

const parsers = new Map([
	// [7e-01] Sample Dump Header
	['f0 7e 7f 01', {
		regexp: /^f0 7e .. 01 .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, ss0, ss1, ee, ff0, ff1, ff2, gg0, gg1, gg2, hh0, hh1, hh2, ii0, ii1, ii2, jj] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x01);

			return {
				commandName: 'Sample Dump Header',
				mfrId, deviceId, subId1,
				sampleNo:      makeValueFrom7bits(ss0, ss1),
				sampleFormat:  ee,
				sampleRate:    makeValueFrom7bits(ff0, ff1, ff2),
				sampleLen:     makeValueFrom7bits(gg0, gg1, gg2),
				loopStartAddr: makeValueFrom7bits(ii0, ii1, ii2),
				loopEndAddr:   makeValueFrom7bits(hh0, hh1, hh2),
				loopType:      jj,
			};
		},
	}],

	// [7e-02] Sample Data Packet
	['f0 7e 7f 02', {
		regexp: /^f0 7e .. 02 .. (?:.. ){120}.. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, kk, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x02);
			const checkSum = payload.pop();
			console.assert(payload.length === 120);
			const isCheckSumError = checkXorError(bytes.slice(1, -1));

			return {
				commandName: 'Sample Data Packet',
				mfrId, deviceId, subId1, payload, checkSum, isCheckSumError,
				packetCount: kk,
			};
		},
	}],

	// [7e-03] Sample Dump Request
	['f0 7e 7f 03', {
		regexp: /^f0 7e .. 03 .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, ss0, ss1] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x03);

			return {
				commandName: 'Sample Dump Request',
				mfrId, deviceId, subId1,
				sampleNo: makeValueFrom7bits(ss0, ss1),
			};
		},
	}],

	// [7e-04] MIDI Time Code
	['f0 7e 7f 04', {
		regexp: /^f0 7e .. 04 .. .. .. .. .. .. .. .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, hr, mn, sc, fr, ff, sl, sm, ...addInfo] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x04);

			//
			switch (subId2) {
			case 0x00:	case 0x01:	case 0x02:	case 0x03:	case 0x04:	case 0x05:	case 0x06:	case 0x09:	case 0x0a:	case 0x0b:	case 0x0d:
				if (addInfo.length !== 0) {
					return null;
				}
				break;
			case 0x07:	case 0x08:	case 0x0c:	case 0x0e:
				if (addInfo.length % 2 !== 0) {
					return null;
				}
				break;
			default:
				return null;
			}

			const subCommandNames = {
				0x00: 'Special',
				0x01: 'Punch In Points',
				0x02: 'Punch Out Points',
				0x03: 'Delete Punch In Point',
				0x04: 'Delete Punch Out Point',
				0x05: 'Event Start Point',
				0x06: 'Event Stop Point',
				0x07: 'Event Start Points with additional info.',
				0x08: 'Event Stop Points with additional info.',
				0x09: 'Delete Event Start Point',
				0x0a: 'Delete Event Stop Point',
				0x0b: 'Cue Points',
				0x0c: 'Cue Points with additional info.',
				0x0d: 'Delete Cue Point',
				0x0e: 'Event Name in additional info.',
			};

			return {
				commandName:    'MIDI Time Code',
				subCommandName: subCommandNames[subId2],
				mfrId, deviceId, subId1, subId2, addInfo,
				hoursAndType:     hr,
				minutes:          mn,
				seconds:          sc,
				frames:           fr,
				fractionalFrames: ff,
				eventNo:          makeValueFrom7bits(sl, sm),
			};
		},
	}],

	// [7e-05] Sample Dump Extensions
	['f0 7e 7f 05 01', {
		regexp: /^f0 7e .. 05 01 .. .. .. .. .. .. .. .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss0, ss1, bb0, bb1, cc, dd0, dd1, dd2, ee0, ee1, ee2] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x05 && subId2 === 0x01);

			return {
				commandName:    'Sample Dump Extensions',
				subCommandName: 'Multiple Loop Messages',
				mfrId, deviceId, subId1, subId2,
				sampleNo:      makeValueFrom7bits(ss0, ss1),
				loopNo:        makeValueFrom7bits(bb0, bb1),
				loopType:      cc,
				loopStartAddr: makeValueFrom7bits(dd0, dd1, dd2),
				loopEndAddr:   makeValueFrom7bits(ee0, ee1, ee2),
			};
		},
	}],
	['f0 7e 7f 05 02', {
		regexp: /^f0 7e .. 05 02 .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss0, ss1, bb0, bb1] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x05 && subId2 === 0x02);

			return {
				commandName:    'Sample Dump Extensions',
				subCommandName: 'Loop Points Request',
				mfrId, deviceId, subId1, subId2,
				sampleNo: makeValueFrom7bits(ss0, ss1),
				loopNo:   makeValueFrom7bits(bb0, bb1),
			};
		},
	}],
	['f0 7e 7f 05 03', {
		regexp: /^f0 7e .. 05 03 .. .. .. (?:.. )*?.. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss0, ss1, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x05 && subId2 === 0x03);

			console.assert(rest.length >= 2);
			const tt = rest[0];
			const nn = rest[1 + tt];
			const sampleTag =  String.fromCharCode(...rest.slice(1, 1 + tt));
			const sampleName = String.fromCharCode(...rest.slice(2 + tt));
			if (nn === undefined || tt !== sampleTag.length || nn !== sampleName.length) {
				return null;
			}

			return {
				commandName:    'Sample Dump Extensions',
				subCommandName: 'Sample Name Transmission',
				mfrId, deviceId, subId1, subId2, sampleTag, sampleName,
				sampleNo: makeValueFrom7bits(ss0, ss1),
			};
		},
	}],
	['f0 7e 7f 05 04', {
		regexp: /^f0 7e .. 05 04 .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss0, ss1] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x05 && subId2 === 0x04);

			return {
				commandName:    'Sample Dump Extensions',
				subCommandName: 'Sample Name Request',
				mfrId, deviceId, subId1, subId2,
				sampleNo: makeValueFrom7bits(ss0, ss1),
			};
		},
	}],
	['f0 7e 7f 05 05', {
		regexp: /^f0 7e .. 05 05 .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss0, ss1, ee, ff0, ff1, ff2, ff3, gg0, gg1, gg2, gg3, hh0, hh1, hh2, hh3, hh4, ii0, ii1, ii2, ii3, ii4, jj0, jj1, jj2, jj3, jj4, kk, ll] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x05 && subId2 === 0x05);

			return {
				commandName:    'Sample Dump Extensions',
				subCommandName: 'Extended Dump Header',
				mfrId, deviceId, subId1, subId2,
				sampleNo:       makeValueFrom7bits(ss0, ss1),
				sampleFormat:   ee,
				sampleRateInt:  makeValueFrom7bits(ff0, ff1, ff2, ff3),
				sampleRateFrac: makeValueFrom7bits(gg0, gg1, gg2, gg3),
				sampleLen:      makeValueFrom7bits(hh0, hh1, hh2, hh3, hh4),
				loopStartPoint: makeValueFrom7bits(ii0, ii1, ii2, ii3, ii4),
				loopEndPoint:   makeValueFrom7bits(jj0, jj1, jj2, jj3, jj4),
				loopType:       kk,
				numChannels:    ll,
			};
		},
	}],
	['f0 7e 7f 05 06', {
		regexp: /^f0 7e .. 05 06 .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss0, ss1, bb0, bb1, cc, dd0, dd1, dd2, dd3, dd4, ee0, ee1, ee2, ee3, ee4] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x05 && subId2 === 0x06);

			return {
				commandName:    'Sample Dump Extensions',
				subCommandName: 'Extended Loop Point Transmission',
				mfrId, deviceId, subId1, subId2,
				sampleNo:      makeValueFrom7bits(ss0, ss1),
				loopNo:        makeValueFrom7bits(bb0, bb1),
				loopType:      cc,
				loopStartAddr: makeValueFrom7bits(dd0, dd1, dd2, dd3, dd4),
				loopEndAddr:   makeValueFrom7bits(ee0, ee1, ee2, ee3, ee4),
			};
		},
	}],
	['f0 7e 7f 05 07', {
		regexp: /^f0 7e .. 05 07 .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss0, ss1, bb0, bb1] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x05 && subId2 === 0x07);

			return {
				commandName:    'Sample Dump Extensions',
				subCommandName: 'Extended Loop Points Request',
				mfrId, deviceId, subId1, subId2,
				sampleNo: makeValueFrom7bits(ss0, ss1),
				loopNo:   makeValueFrom7bits(bb0, bb1),
			};
		},
	}],

	// [7e-06] General Information
	['f0 7e 7f 06 01', {
		regexp: /^f0 7e .. 06 01 f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x06 && subId2 === 0x01);

			return {
				commandName:    'General Information',
				subCommandName: 'Identity Request',
				mfrId, deviceId, subId1, subId2,
			};
		},
	}],
	['f0 7e 7f 06 02', {
		regexp: /^f0 7e .. 06 02 .. .. .. .. .. .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, mm, ff0, ff1, dd0, dd1, ss0, ss1, ss2, ss3] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x06 && subId2 === 0x02);

			return {
				commandName:    'General Information',
				subCommandName: 'Identity Reply',
				mfrId, deviceId, subId1, subId2,
				makerId:          mm,
				familyCode:       makeValueFrom7bits(ff0, ff1),
				familyMemberCode: makeValueFrom7bits(dd0, dd1),
				versionInfo:      [ss0, ss1, ss2, ss3],
			};
		},
	}],

	// [7e-07] File Dump
	['f0 7e 7f 07 01', {
		regexp: /^f0 7e .. 07 01 .. .. .. .. .. .. .. .. .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss, type0, type1, type2, type3, length0, length1, length2, length3, ...rest] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x07 && subId2 === 0x01);

			const fileLength = makeValueFrom7bits(length0, length1, length2, length3);
			if (fileLength !== rest.length) {
				return null;
			}

			return {
				commandName:    'File Dump',
				subCommandName: 'Header',
				mfrId, deviceId, subId1, subId2, fileLength,
				senderDeviceId: ss,
				fileType:       String.fromCharCode([type0, type1, type2, type3]),
				fileName:       String.fromCharCode(rest),
			};
		},
	}],
	['f0 7e 7f 07 02', {
		regexp: /^f0 7e .. 07 02 .. .. (?:.. )+?.. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, packetNo, byteCountRaw, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x07 && subId2 === 0x02);
			const checkSum = payload.pop();
			const isCheckSumError = checkXorError(bytes.slice(1, -1));

			const byteCount = byteCountRaw + 1;	// The byte count is the number of encoded data bytes minus one.
			if (byteCount !== payload.length) {
				return null;
			}

			const dataBytes = [];
			for (let i = 0; i < byteCount; i++) {
				const indexAuxByte = i % 8 * 8;
				if (i === indexAuxByte) {
					continue;
				}
				const msb = ((payload[indexAuxByte] & (1 << (7 - i % 8))) !== 0) ? 0x80 : 0x00;
				dataBytes.push(msb | payload[i]);
			}

			return {
				commandName:    'File Dump',
				subCommandName: 'Data Packet',
				mfrId, deviceId, subId1, subId2, packetNo, byteCountRaw, byteCount, checkSum, isCheckSumError,
				data: new Uint8Array(dataBytes),
			};
		},
	}],
	['f0 7e 7f 07 03', {
		regexp: /^f0 7e .. 07 03 .. .. .. .. .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ss, type0, type1, type2, type3, ...name] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x07 && subId2 === 0x03);

			return {
				commandName:    'File Dump',
				subCommandName: 'Request',
				mfrId, deviceId, subId1, subId2,
				requesterDeviceId: ss,
				fileType:          String.fromCharCode([type0, type1, type2, type3]),
				fileName:          String.fromCharCode(name),
			};
		},
	}],

	// [7e-08] MIDI Tuning Standard (Non-Real Time)
	['f0 7e 7f 08 00', {
		regexp: /^f0 7e .. 08 00 .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, tt] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x08 && subId2 === 0x00);

			return {
				commandName:    'MIDI Tuning Standard - Non-RT',
				subCommandName: 'Bulk Dump Request',
				mfrId, deviceId, subId1, subId2,
				tuningProgramNo: tt,
			};
		},
	}],
	['f0 7e 7f 08 01', {
		regexp: /^f0 7e .. 08 01 .. (?:.. ){16}(?:.. .. .. ){128}.. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, tt, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x08 && subId2 === 0x01);
			const checkSum = payload.pop();
			const isCheckSumError = checkXorError(bytes.slice(1, -1));

			const tuningName = String.fromCharCode(...payload.slice(0, 16));
			const frequencies = splitArrayByN([...payload.slice(16)], 3);
			console.assert(frequencies.length === 128);

			return {
				commandName:    'MIDI Tuning Standard - Non-RT',
				subCommandName: 'Bulk Dump Reply',
				mfrId, deviceId, subId1, subId2, tuningName, frequencies, checkSum, isCheckSumError,
				tuningProgramNo: tt,
			};
		},
	}],
	['f0 7e 7f 08 03', {
		regexp: /^f0 7e .. 08 03 .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, bb, tt] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x08 && subId2 === 0x03);

			return {
				commandName:    'MIDI Tuning Standard - Non-RT',
				subCommandName: 'Tuning Dump Request',
				mfrId, deviceId, subId1, subId2,
				bankNo:          bb,
				tuningProgramNo: tt,
			};
		},
	}],
	['f0 7e 7f 08 04', {
		regexp: /^f0 7e .. 08 04 .. .. (?:.. ){16}(?:.. .. .. ){128}.. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, bb, tt, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x08 && subId2 === 0x04);
			const checkSum = payload.pop();
			const isCheckSumError = checkXorError(bytes.slice(1, -1));

			const tuningName = String.fromCharCode(...payload.slice(0, 16));
			const frequencies = splitArrayByN([...payload.slice(16)], 3);
			console.assert(frequencies.length === 128);

			return {
				commandName:    'MIDI Tuning Standard - Non-RT',
				subCommandName: 'Key-Based Tuning Dump',
				mfrId, deviceId, subId1, subId2, tuningName, frequencies, checkSum, isCheckSumError,
				bankNo:          bb,
				tuningProgramNo: tt,
			};
		},
	}],
	['f0 7e 7f 08 05', {
		regexp: /^f0 7e .. 08 05 .. .. (?:.. ){16}(?:.. ){12}.. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, bb, tt, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x08 && subId2 === 0x05);
			const checkSum = payload.pop();
			const isCheckSumError = checkXorError(bytes.slice(1, -1));

			const tuningName = String.fromCharCode(...payload.slice(0, 16));
			const frequencies = [...payload.slice(16)];
			console.assert(frequencies.length === 12);

			return {
				commandName:    'MIDI Tuning Standard - Non-RT',
				subCommandName: 'Scale/Octave Tuning Dump, 1-byte format',
				mfrId, deviceId, subId1, subId2, tuningName, frequencies, checkSum, isCheckSumError,
				bankNo:          bb,
				tuningProgramNo: tt,
			};
		},
	}],
	['f0 7e 7f 08 06', {
		regexp: /^f0 7e .. 08 06 .. .. (?:.. ){16}(?:.. .. ){12}.. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, bb, tt, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x08 && subId2 === 0x06);
			const checkSum = payload.pop();
			const isCheckSumError = checkXorError(bytes.slice(1, -1));

			const tuningName = String.fromCharCode(...payload.slice(0, 16));
			const frequencies = splitArrayByN([...payload.slice(16)], 2);
			console.assert(frequencies.length === 12);

			return {
				commandName:    'MIDI Tuning Standard - Non-RT',
				subCommandName: 'Scale/Octave Tuning Dump, 2-byte format',
				mfrId, deviceId, subId1, subId2, tuningName, frequencies, checkSum, isCheckSumError,
				bankNo:          bb,
				tuningProgramNo: tt,
			};
		},
	}],
	['f0 7e 7f 08 07', {
		regexp: /^f0 7e .. 08 07 .. .. .. (?:.. .. .. .. )+?f7$/u,
		handler: handleTuningSingleNoteWithBank,
	}],
	['f0 7e 7f 08 08', {
		regexp: /^f0 7e .. 08 08 .. .. .. (?:.. ){12}f7$/u,
		handler: handleScaleTuning1byte,
	}],
	['f0 7e 7f 08 09', {
		regexp: /^f0 7e .. 08 09 .. .. .. (?:.. .. ){12}.. f7$/u,
		handler: handleScaleTuning2byte,
	}],

	// [7e-09] General MIDI
	['f0 7e 7f 09 01', {
		regexp: /^f0 7e .. 09 01 f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x09 && subId2 === 0x01);

			return {
				commandName: 'General MIDI 1 System On',
				mfrId, deviceId, subId1, subId2,
			};
		},
	}],
	['f0 7e 7f 09 02', {
		regexp: /^f0 7e .. 09 02 f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x09 && subId2 === 0x02);

			return {
				commandName: 'General MIDI 1 System Off',
				mfrId, deviceId, subId1, subId2,
			};
		},
	}],
	['f0 7e 7f 09 03', {
		regexp: /^f0 7e .. 09 03 f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x09 && subId2 === 0x03);

			return {
				commandName: 'General MIDI 2 System On',
				mfrId, deviceId, subId1, subId2,
			};
		},
	}],

	// [7e-0a] Downloadable Sounds
	['f0 7e 7f 0a', {
		regexp: /^f0 7e .. 0a .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x0a);

			if (subId2 < 0x00 || 0x04 < subId2) {
				return null;
			}

			const subCommandNames = {
				0x00: 'Turn DLS On',
				0x01: 'Turn DLS Off',
				0x02: 'Turn DLS Voice Allocation On',
				0x03: 'Turn DLS Voice Allocation Off',
			};

			return {
				commandName:    'Downloadable Sounds',
				subCommandName: subCommandNames[subId2],
				mfrId, deviceId, subId1, subId2,
			};
		},
	}],

	// [7e-0b] File Reference Message
	['f0 7e 7f 0b', {
		regexp: /^f0 7e .. 0b .. .. .. .. .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ctx0, ctx1, len0, len1, ...data] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x0b);

			if (subId2 < 0x01 || 0x04 < subId2) {
				return null;
			}
			const len = makeValueFrom7bits(len0, len1);
			if (data.length !== len) {
				return null;
			}

			const subCommandNames = {
				0x01: 'Open File',
				0x02: 'Select or Reselect Contents',
				0x03: 'Open File and Select Contents',
				0x04: 'Close File',
			};

			return {
				commandName:    'File Reference Message',
				subCommandName: subCommandNames[subId2],
				mfrId, deviceId, subId1, subId2, data,
				context: [ctx0, ctx1],
			};
		},
	}],

	// [7e-0c] MIDI Visual Control
	['f0 7e 7f 0c 01', {
		regexp: /^f0 7e .. 0c 01 .. .. .. (?:.. )+?.. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, addr0, addr1, addr2, ...data] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x0c && subId2 === 0x01);
			const checkSum = data.pop();
			const isCheckSumError = checkSumError(bytes.slice(5, -1));

			return {
				commandName: 'MIDI Visual Control',
				mfrId, deviceId, subId1, subId2, data, checkSum, isCheckSumError,
				addr: [addr0, addr1, addr2],
			};
		},
	}],

	// [7e-0d] MIDI Capability Inquiry
	['f0 7e 7f 0d', {
		regexp: /^f0 7e .. 0d .. .. .. .. .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, versionInfo, mnId0, mnId1, mnId2, mnId3, ...data] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7e && subId1 === 0x0d);

			return {
				commandName: 'MIDI Capability Inquiry',
				mfrId, deviceId, subId1, subId2, versionInfo, data,
				mnId: makeValueFrom7bits(mnId0, mnId1, mnId2, mnId3),
			};
		},
	}],

	// [7f-01] MIDI Time Code
	['f0 7f 7f 01 01', {
		regexp: /^f0 7f .. 01 01 .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, hr, mn, sc, fr] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x01 && subId2 === 0x01);

			return {
				commandName:    'MIDI Time Code',
				subCommandName: 'Full Message',
				mfrId, deviceId, subId1, subId2,
				hoursAndType: hr,
				minutes:      mn,
				seconds:      sc,
				frames:       fr,
			};
		},
	}],
	['f0 7f 7f 01 02', {
		regexp: /^f0 7f .. 01 02 .. .. .. .. .. .. .. .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, u1, u2, u3, u4, u5, u6, u7, u8, u9] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x01 && subId2 === 0x02);

			return {
				commandName:    'MIDI Time Code',
				subCommandName: 'User Bits',
				mfrId, deviceId, subId1, subId2,
				userBits: [u1, u2, u3, u4, u5, u6, u7, u8, u9],
			};
		},
	}],

	// [7f-02] MIDI Show Control
	['f0 7f 7f 02', {
		regexp: /^f0 7f .. 02 .. .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, commandFormat, command, ...data] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x02);

			// Note: Multi-byte command format and command for extensions are not supported.
			return {
				commandName: 'MIDI Show Control',
				mfrId, deviceId, subId1, subId2, commandFormat, command, data,
			};
		},
	}],

	// [7f-03] Notation Information
	['f0 7f 7f 03 01', {
		regexp: /^f0 7f .. 03 01 .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, aa0, aa1] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x03 && subId2 === 0x01);
			const barNo = makeValueFrom7bits(aa0, aa1);

			return {
				commandName:    'Notation Information',
				subCommandName: 'Bar Number',
				mfrId, deviceId, subId1, subId2,
				barNo: ((barNo & 0x2000) === 0) ? barNo : -(0x2000 - (barNo & 0x1fff)),
			};
		},
	}],
	['f0 7f 7f 03 02', {
		regexp: /^f0 7f .. 03 02 .. .. .. .. .. (?:.. .. )*?f7$/u,
		handler: handleTimeSignature,
	}],
	['f0 7f 7f 03 42', {
		regexp: /^f0 7f .. 03 42 .. .. .. .. .. (?:.. .. )*?f7$/u,
		handler: handleTimeSignature,
	}],

	// [7f-04] Device Control
	['f0 7f 7f 04 01', {
		regexp: /^f0 7f .. 04 01 .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x04 && subId2 === 0x01 && payload.length === 2);

			return {
				commandName:    'Device Control',
				subCommandName: 'Master Volume',
				mfrId, deviceId, subId1, subId2, payload,
			};
		},
	}],
	['f0 7f 7f 04 02', {
		regexp: /^f0 7f .. 04 02 .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x04 && subId2 === 0x02 && payload.length === 2);

			return {
				commandName:    'Device Control',
				subCommandName: 'Master Balance',
				mfrId, deviceId, subId1, subId2, payload,
			};
		},
	}],
	['f0 7f 7f 04 03', {
		regexp: /^f0 7f .. 04 03 .. .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x04 && subId2 === 0x03 && payload.length === 2);

			return {
				commandName:    'Device Control',
				subCommandName: 'Master Fine Tuning',
				mfrId, deviceId, subId1, subId2, payload,
			};
		},
	}],
	['f0 7f 7f 04 04', {
		regexp: /^f0 7f .. 04 04 00 .. f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x04 && subId2 === 0x04 && payload.length === 2);

			return {
				commandName:    'Device Control',
				subCommandName: 'Master Coarse Tuning',
				mfrId, deviceId, subId1, subId2, payload,
			};
		},
	}],
	['f0 7f 7f 04 05', {
		regexp: /^f0 7f .. 04 05 .. .. .. (?:.. .. )*?(?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, sw, pw, vw, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x04 && subId2 === 0x05);

			const slots = splitArrayByN([...payload.slice(0, 2 * sw)], 2);
			if (slots.length !== sw) {
				return null;
			}
			const parameters = splitArrayByN([...payload.slice(2 * sw)], pw + vw).reduce((p, c) => {
				const pws = c.slice(0, pw);
				const vws = c.slice(pw, pw + vw);
				p[makeValueFrom7bits(...pws)] = vws;
				return p;
			}, {});

			return {
				commandName:    'Device Control',
				subCommandName: 'Global Parameter Control',
				mfrId, deviceId, subId1, subId2, payload, slots, parameters,
			};
		},
	}],

	// [7f-05] Real Time MTC Cueing
	['f0 7e 7f 05', {
		regexp: /^f0 7e .. 05 .. .. .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, sl, sm, ...addInfo] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x05);

			// Checks the length of additional information bytes.
			switch (subId2) {
			case 0x00:	case 0x01:	case 0x02:	case 0x05:	case 0x06:	case 0x0b:
				if (addInfo.length !== 0) {	// No additional information for those commands.
					return null;
				}
				break;
			case 0x07:	case 0x08:	case 0x0c:	case 0x0e:
				if (addInfo.length % 2 !== 0) {	// Additional information bytes shall be stored as nibbles.
					return null;
				}
				break;
			default:
				return null;
			}

			const subCommandNames = {
				0x00: 'Special',
				0x01: 'Punch In Points',
				0x02: 'Punch Out Points',
				0x05: 'Event Start Point',
				0x06: 'Event Stop Point',
				0x07: 'Event Start Points with additional info.',
				0x08: 'Event Stop Points with additional info.',
				0x0b: 'Cue Points',
				0x0c: 'Cue Points with additional info.',
				0x0e: 'Event Name in additional info.',
			};

			return {
				commandName:   'Real Time MTC Cueing',
				subCommandName: subCommandNames[subId2],
				mfrId, deviceId, subId1, subId2, addInfo,
				eventNo: makeValueFrom7bits(sl, sm),
			};
		},
	}],

	// [7f-06] MIDI Machine Control Commands
	['f0 7f 7f 06', {
		regexp: /^f0 7f .. 06 .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, command, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x06);

			// Note: Multi-byte command for extensions is not supported.
			return {
				commandName: 'MIDI Machine Control Commands',
				mfrId, deviceId, subId1, subId2, command, payload,
			};
		},
	}],

	// [7f-07] MIDI Machine Control Responses
	['f0 7f 7f 07', {
		regexp: /^f0 7f .. 07 .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, command, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x07);

			// Note: Multi-byte response for extensions is not supported.
			return {
				commandName: 'MIDI Machine Control Responses',
				mfrId, deviceId, subId1, subId2, command, payload,
			};
		},
	}],

	// [7f-08] MIDI Tuning Standard (Real Time)
	['f0 7f 7f 08 02', {
		regexp: /^f0 7f .. 08 02 .. .. (?:.. .. .. .. )+?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, tt, ll, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x08 && subId2 === 0x02);

			if (payload.length !== 4 * ll) {
				return null;
			}
			const frequencies = splitArrayByN([...payload], 4).reduce((p, c) => {
				p[c[0]] = c.slice(1);
				return p;
			}, {});

			return {
				commandName:    'MIDI Tuning Standard - RT',
				subCommandName: 'Single Note Tuning Change with Bank Select',
				mfrId, deviceId, subId1, subId2, frequencies,
				tuningProgramNo: tt,
			};
		},
	}],
	['f0 7f 7f 08 07', {
		regexp: /^f0 7f .. 08 07 .. .. .. (?:.. .. .. .. )+?f7$/u,
		handler: handleTuningSingleNoteWithBank,
	}],
	['f0 7f 7f 08 08', {
		regexp: /^f0 7f .. 08 08 .. .. .. (?:.. ){12}f7$/u,
		handler: handleScaleTuning1byte,
	}],
	['f0 7f 7f 08 09', {
		regexp: /^f0 7f .. 08 09 .. .. .. (?:.. .. ){12}.. f7$/u,
		handler: handleScaleTuning2byte,
	}],

	// [7f-09] Controller Destination Setting
	['f0 7f 7f 09 01', {
		regexp: /^f0 7f .. 09 01 .. (?:.. .. )+?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, channel, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x09 && subId2 === 0x01);

			if (payload.length % 2 !== 0) {
				return null;
			}
			const parameters = splitArrayByN([...payload], 2).reduce((p, c) => {
				p[c[0]] = c[1];
				return p;
			}, {});

			return {
				commandName:    'Controller Destination Setting',
				subCommandName: 'Channel Pressure',
				mfrId, deviceId, subId1, subId2, channel, parameters,
			};
		},
	}],
	['f0 7f 7f 09 02', {
		regexp: /^f0 7f .. 09 02 .. (?:.. .. )+?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, channel, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x09 && subId2 === 0x02);

			if (payload.length % 2 !== 0) {
				return null;
			}
			const parameters = splitArrayByN([...payload], 2).reduce((p, c) => {
				p[c[0]] = c[1];
				return p;
			}, {});

			return {
				commandName:    'Controller Destination Setting',
				subCommandName: 'Polyphonic Key Pressure',
				mfrId, deviceId, subId1, subId2, channel, parameters,
			};
		},
	}],
	['f0 7f 7f 09 03', {
		regexp: /^f0 7f .. 09 03 .. .. (?:.. .. )+?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, channel, controlNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x09 && subId2 === 0x03);

			if (payload.length % 2 !== 0) {
				return null;
			}
			const parameters = splitArrayByN([...payload], 2).reduce((p, c) => {
				p[c[0]] = c[1];
				return p;
			}, {});

			return {
				commandName:    'Controller Destination Setting',
				subCommandName: 'Control Change Message',
				mfrId, deviceId, subId1, subId2, channel, controlNo, parameters,
			};
		},
	}],

	// [7f-0a] Key-based Instrument Control
	['f0 7f 7f 0a 01', {
		regexp: /^f0 7f .. 0a 01 .. .. (?:.. .. )+?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, channel, keyNo, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x0a && subId2 === 0x01);

			if (payload.length % 2 !== 0) {
				return null;
			}
			const parameters = splitArrayByN([...payload], 2).reduce((p, c) => {
				p[c[0]] = c[1];
				return p;
			}, {});

			return {
				commandName: 'Key-based Instrument Control',
				mfrId, deviceId, subId1, subId2, channel, keyNo, parameters,
			};
		},
	}],

	// [7f-0b] Scalable Polyphony MIDI MIP Message
	['f0 7f 7f 0b 01', {
		regexp: /^f0 7f .. 0b 01 (?:.. .. )+?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, ...payload] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x0b && subId2 === 0x01);

			if (payload.length % 2 !== 0) {
				return null;
			}
			const mips = splitArrayByN([...payload], 2).reduce((p, c) => {
				p[c[0]] = c[1];
				return p;
			}, {});

			return {
				commandName: 'Scalable Polyphony MIDI MIP Message',
				mfrId, deviceId, subId1, subId2, mips,
			};
		},
	}],

	// [7f-0c] Mobile Phone Control Message
	['f0 7f 7f 0c 00', {
		regexp: /^f0 7f .. 0c 00 .. .. .. (?:.. )*?f7$/u,
		handler: (bytes) => {
			const [mfrId, deviceId, subId1, subId2, dd, ii, cc, ...data] = stripEnclosure(bytes);
			console.assert(mfrId === 0x7f && subId1 === 0x0c && subId2 === 0x00);

			return {
				commandName: 'Mobile Phone Control Message',
				mfrId, deviceId, subId1, subId2, data,
				deviceClassId: dd,
				deviceIndex:   ii,
				cmdId:         cc,
			};
		},
	}],
]);

function handleTimeSignature(bytes) {
	const [mfrId, deviceId, subId1, subId2, ln, nn, dd, cc, bb, ...payload] = stripEnclosure(bytes);
	console.assert(mfrId === 0x7f && subId1 === 0x03 && (subId2 === 0x02 || subId2 === 0x42));

	if (ln % 2 !== 0 || ln - 4 !== payload.length) {
		return null;
	}

	return {
		commandName:    'Time Signature',
		subCommandName: (subId2 === 0x02) ? 'Immediate' : 'Delayed',
		mfrId, deviceId, subId1, subId2,
		numerator:                nn,
		denominator:              2 ** dd,
		numMidiClocks:            cc,
		num32ndNotes:             bb,
		additionalTimeSignatures: splitArrayByN(payload, 2).map((e) => ({numerator: e[0], denominator: 2 ** e[1]})),
	};
}

function handleTuningSingleNoteWithBank(bytes) {
	const [mfrId, deviceId, subId1, subId2, bb, tt, ll, ...payload] = stripEnclosure(bytes);
	console.assert((mfrId === 0x7e || mfrId === 0x7f) && subId1 === 0x08 && subId2 === 0x07);

	if (payload.length !== 4 * ll) {
		return null;
	}
	const frequencies = splitArrayByN([...payload], 4).reduce((p, c) => {
		p[c[0]] = c[1];
		return p;
	}, {});

	return {
		commandName:    `MIDI Tuning Standard - ${(mfrId === 0x7e) ? 'Non-' : ''}RT`,
		subCommandName: 'Single Note Tuning Change with Bank Select',
		mfrId, deviceId, subId1, subId2, frequencies,
		bankNo:          bb,
		tuningProgramNo: tt,
	};
}

function handleScaleTuning1byte(bytes) {
	const [mfrId, deviceId, subId1, subId2, ff, gg, hh, ...payload] = stripEnclosure(bytes);
	console.assert((mfrId === 0x7e || mfrId === 0x7f) && subId1 === 0x08 && subId2 === 0x08);

	const frequencies = [...payload];
	console.assert(frequencies.length === 12);

	return {
		commandName:    `MIDI Tuning Standard - ${(mfrId === 0x7e) ? 'Non-' : ''}RT`,
		subCommandName: 'Scale/Octave Tuning, 1-byte format',
		mfrId, deviceId, subId1, subId2, frequencies,
		channelBits: makeValueFrom7bits(hh, gg, ff),
	};
}

function handleScaleTuning2byte(bytes) {
	const [mfrId, deviceId, subId1, subId2, ff, gg, hh, ...payload] = stripEnclosure(bytes);
	console.assert((mfrId === 0x7e || mfrId === 0x7f) && subId1 === 0x08 && subId2 === 0x08);

	const frequencies = splitArrayByN([...payload.slice(16)], 2);
	console.assert(frequencies.length === 12);

	return {
		commandName:    `MIDI Tuning Standard - ${(mfrId === 0x7e) ? 'Non-' : ''}RT`,
		subCommandName: 'Scale/Octave Tuning, 2-byte format',
		mfrId, deviceId, subId1, subId2, frequencies,
		channelBits: makeValueFrom7bits(hh, gg, ff),
	};
}

function checkXorError(bytes) {
	console.assert(bytes && bytes.length);
	return bytes.reduce((p, c) => p ^ c) === 0;
}

function makeValueFrom7bits(...bytes) {
	return bytes.slice(0, 4).reduce((p, c, i) => p | ((c & 0x7f) << (i * 7)));
}

function splitArrayByN(elems, num) {
	console.assert(elems && elems.length);
	return elems.reduce((p, _, i, a) => {
		if (i % num === 0) {
			p.push(a.slice(i, i + num));
			console.assert(p[p.length - 1].length === num);
		}
		return p;
	}, []);
}

// Add parsers to the global SysEx parser.
addSysExParsers(parsers);
