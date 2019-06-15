import {analyzeSysEx} from './sysex.js';

const channelMessageNames = {
	0x8: 'Note Off',
	0x9: 'Note On',
	0xa: 'Polyphonic Key Pressure',
	0xb: 'Control Change',
	0xc: 'Program Change',
	0xd: 'Channel Pressure',
	0xe: 'Pitch Bend Change',
};

const systemMessageNames = {
	0xf1: 'MIDI Time Code Quarter Frame',
	0xf2: 'Song Position Pointer',
	0xf3: 'Song Select',
	0xf5: '(Port Select)',
	0xf6: 'Tune Request',
	0xf7: 'End of System Exclusive',
	0xf8: 'Timing Clock',
	0xfa: 'Start',
	0xfb: 'Continue',
	0xfc: 'Stop',
	0xfe: 'Active Sensing',
	0xff: 'System Reset',
};

const controllerNames = {
	0x00: 'Bank Select (MSB)',
	0x01: 'Modulation (MSB)',
	0x02: 'Breath Controller (MSB)',
	0x04: 'Foot Controller (MSB)',
	0x05: 'Portamento Time (MSB)',
	0x06: 'Data Entry (MSB)',
	0x07: 'Channel Volume (MSB)',
	0x08: 'Balance (MSB)',
	0x0a: 'Pan (MSB)',
	0x0b: 'Expression (MSB)',
	0x0c: 'Effect Control 1 (MSB)',
	0x0d: 'Effect Control 2 (MSB)',
	0x10: 'General Purpose Controller #1 (MSB)',
	0x11: 'General Purpose Controller #2 (MSB)',
	0x12: 'General Purpose Controller #3 (MSB)',
	0x13: 'General Purpose Controller #4 (MSB)',

	0x20: 'Bank Select (LSB)',
	0x21: 'Modulation (LSB)',
	0x22: 'Breath Controller (LSB)',
	0x24: 'Foot Controller (LSB)',
	0x25: 'Portamento Time (LSB)',
	0x26: 'Data entry (LSB)',
	0x27: 'Channel Volume (LSB)',
	0x28: 'Balance (LSB)',
	0x2a: 'Pan (LSB)',
	0x2b: 'Expression (LSB)',
	0x2c: 'Effect Control 1 (LSB)',
	0x2d: 'Effect Control 2 (LSB)',
	0x30: 'General Purpose Controller #1 (LSB)',
	0x31: 'General Purpose Controller #2 (LSB)',
	0x32: 'General Purpose Controller #3 (LSB)',
	0x33: 'General Purpose Controller #4 (LSB)',

	0x40: 'Damper Pedal',
	0x41: 'Portamento On/Off',
	0x42: 'Sostenuto',
	0x43: 'Soft Pedal',
	0x44: 'Legato Footswitch',
	0x45: 'Hold 2',

	0x46: 'Sound Variation',
	0x47: 'Timbre/Harmonic Intensity',
	0x48: 'Release Time',
	0x49: 'Attack Time',
	0x4a: 'Brightness',
	0x4b: 'Decay Time',
	0x4c: 'Vibrato Rate',
	0x4d: 'Vibrato Depth',
	0x4e: 'Vibrato Delay',
	0x4f: 'Sound Controller #10',

	0x50: 'General Purpose Controller #5',
	0x51: 'General Purpose Controller #6',
	0x52: 'General Purpose Controller #7',
	0x53: 'General Purpose Controller #8',

	0x54: 'Portamento Control',

	0x5b: 'Reverb Send Level',
	0x5c: 'Effect 2 Depth',
	0x5d: 'Chorus Send Level',
	0x5e: 'Effect 4 Depth',
	0x5f: 'Effect 5 Depth',

	0x60: 'Data Increment',
	0x61: 'Data Decrement',
	0x62: 'Non-Registered Parameter Number (LSB)',
	0x63: 'Non-Registered Parameter Number (MSB)',
	0x64: 'Registered Parameter Number (LSB)',
	0x65: 'Registered Parameter Number (MSB)',

	// (including channel mode messages)
	0x78: 'All Sound Off',
	0x79: 'Reset All Controllers',
	0x7a: 'Local Control',
	0x7b: 'All Notes Off',
	0x7c: 'Omni Off',
	0x7d: 'Omni On',
	0x7e: 'Mono On',
	0x7f: 'Poly On',
};

export function analyzeMidiMessage(bytes) {
	if (!bytes || !bytes.length || (bytes[0] & 0x80) === 0 || bytes[0] === 0xff) {
		return null;
	}

	let mes;
	if (bytes[0] === 0xf0) {	// For SysEx
		mes = {kind: 'f0', bytes, ...analyzeSysEx(bytes)};
	} else if ((bytes[0] & 0xf0) !== 0xf0) {	// For Channel Messages
		mes = analyzeChannelMessage(bytes);
	} else {	// For System Common Message and System Real-time Message
		mes = analyzeSystemMessage(bytes);
	}

	return mes;
}

function analyzeChannelMessage(bytes) {
	console.assert(bytes && bytes.length);

	const k = bytes[0] >> 4;

	const mes = {
		kind: `${k.toString(16)}`,
		channelNo: bytes[0] & 0x0f,
		commandName: channelMessageNames[k],
	};

	switch (k) {
	case 0x8:	// Note Off
	case 0x9:	// Note On
	case 0xa:	// Polyphonic Key Pressure
	case 0xb:	// Control Change
		if (bytes.length !== 3) {
			return null;
		}
		mes.param = bytes[1];
		mes.value = bytes[2];
		break;
	case 0xc:	// Program Change
	case 0xd:	// Channel Pressure
		if (bytes.length !== 2) {
			return null;
		}
		mes.value = bytes[1];
		break;
	case 0xe:	// Pitch Bend Change
		if (bytes.length !== 3) {
			return null;
		}
		mes.value = bytes[1] | (bytes[2] << 7);
		break;
	default:
		return null;
	}

	if (k === 0xb) {
		mes.subCommandName = controllerNames[mes.param];
		if (!mes.subCommandName) {
			mes.subCommandName = `Undefined (CC#${mes.param})`;
		}
	}

	return mes;
}

function analyzeSystemMessage(bytes) {
	console.assert(bytes && bytes.length);

	const k = bytes[0];

	const mes = {
		kind: 'f',
		commandName: systemMessageNames[k],
	};

	switch (k) {
	case 0xf1:	// MIDI Time Code Quarter Frame
	case 0xf3:	// Song Select
		if (bytes.length !== 2) {
			return null;
		}
		mes.value = bytes[1];
		break;
	case 0xf2:	// Song Position Pointer
		if (bytes.length !== 3) {
			return null;
		}
		mes.value = bytes[1] | (bytes[2] << 7);
		break;
	case 0xf5:	// (Port Select)
		if (bytes.length > 1) {
			mes.value = bytes[1];
		}
		break;
	case 0xf6:	// Tune Request
	case 0xf7:	// End of System Exclusive
	case 0xf8:	// Timing Clock
	case 0xfa:	// Start
	case 0xfb:	// Continue
	case 0xfc:	// Stop
	case 0xfe:	// Active Sensing
	case 0xff:	// System Reset
		if (bytes.length !== 1) {
			return null;
		}
		break;
	case 0xf4:
	case 0xf9:
	case 0xfd:
		break;
	default:
		return null;
	}

	return mes;
}
