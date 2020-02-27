import {analyzeMidiMessage} from './midi_event.js';
import {analyzeRpn, analyzeNrpn} from './rpn_nrpn.js';

class MidiValue {
	constructor(value) {
		this.init(value);
	}

	init(value) {
		if (value !== undefined) {
			this._value = value;
			this._initialValue = value;
			this._isInitialized = true;
		} else {
			this._value = this._initialValue;
			this._isInitialized = (this._initialValue !== undefined);
		}
		if (this._isChanged) {
			this._isChanged = false;
		}
	}

	get value() {
		return this._value;
	}
	set value(value) {
		this._value = value;
		this._isChanged = true;
	}
}

class MidiPort {
	constructor(portNo, inputMidiMessage) {
		console.assert(portNo >= 0 && typeof inputMidiMessage === 'function');

		this._portNo = portNo;
		this._inputMidiMessage = inputMidiMessage;

		this._runningStatus = 0x00;
		this._restBuf = [];
	}

	inputBytes(bytes) {
		console.assert(bytes && bytes.length);

		// Normal case: Input bytes contain only single "complete" MIDI message and the rest buffer is empty.
		// Note: "complete" means that the MIDI message doesn't need a running status byte to parse.
		if (this._restBuf.length === 0) {
			const statusByte = bytes[0];
			if (bytes.length === getMessageLength(statusByte)) {
				this._runningStatus = getNewRunningStatus(statusByte, this._runningStatus);
				return this._inputMidiMessage(bytes, this._portNo);
			} else if (statusByte === 0xf0) {
				const indexF7 = bytes.indexOf(0xf7);
				if (bytes.length === indexF7 + 1) {
					this._runningStatus = 0x00;
					return this._inputMidiMessage(bytes, this._portNo);
				}
			}
		}

		// Irregular case: Incomplete message remains in the rest buffer or input bytes contain multiple MIDI messages.
		let buf = this._restBuf.concat([...bytes]);

		const results = [];
		while (buf.length > 0) {
			// If the first byte isn't MSB-set, tries to apply running status byte.
			if ((buf[0] & 0x80) === 0) {
				// If running status byte cannot be applied, trashes the first byte and restart parsing.
				if ((this._runningStatus & 0x80) === 0) {
					buf = buf.slice(1);
					continue;
				}

				buf = [this._runningStatus, ...buf];
			}

			if (buf[0] !== 0xf0) {
				// If the current buffer doesn't contain complete MIDI message, exits the loop.
				const len = getMessageLength(buf[0]);
				if (len > buf.length) {
					break;
				}

				// Sends a MIDI message from the current buffer.
				this._runningStatus = getNewRunningStatus(buf[0], this._runningStatus);
				results.push(...this._inputMidiMessage(buf.slice(0, len), this._portNo));
				buf = buf.slice(len);

			} else {
				this._runningStatus = 0x00;

				// Finds F7 (EOX) to check whether the current buffer contain complete SysEx.
				const indexF7 = buf.indexOf(0xf7);
				if (indexF7 < 0) {
					// If the current buffer (== incomplete SysEx) contains MSB-set byte, treats it as wrong message.
					const indexMsb = buf.findIndex((e, i) => i > 0 && (e & 0x80) !== 0);
					if (indexMsb < 0) {
						// Exits the loop to wait for subsequent bytes by calling next inputBytes().
						break;
					} else {
						// Trashes incomplete SysEx message bytes and restart parsing the rest buffer from MSB-set byte.
						buf = buf.slice(indexMsb);
						continue;
					}
				} else {
					// Sends a SysEx message from the current buffer.
					const len = indexF7 + 1;
					results.push(...this._inputMidiMessage(buf.slice(0, len), this._portNo));
					buf = buf.slice(len);
				}
			}
		}

		this._restBuf = buf;

		return results;
	}
}

export class MidiModule {
	constructor(partNum = 16, portNum = 1) {
		console.assert(partNum > 0);

		this._ports = Object.freeze([...new Array(portNum)].map((_, portNo) => new MidiPort(portNo, this._inputMidiMessage.bind(this))));

		this._staticParams  = new Map();	// for PAf, CC, PC, CAf, and PB
		this._dynamicParams = new Map();	// for CC, RPN, and NRPN
		this._parts = Object.freeze([...new Array(partNum)].map((_, partNo) => {
			const part = {
				partNo,
				notes: Object.freeze([...new Array(128)].map((_) => ({
					isOn: false,
					velocity: 0,
					pressure: new MidiValue(0),
				}))),
				ccs: Object.freeze([...new Array(128)].map(() => new MidiValue())),
				pc: {
					progNo: new MidiValue(0),
					bankM: 0,
					bankL: 0,
				},
				pressure: new MidiValue(0),
				pitch: new MidiValue(8192),

				lastPN: new MidiValue(undefined),

				rpnM:  (msb, lsb) => this._getRpnNrpn(makeKey({kind: 'rpn',  params: [msb, lsb, 0], partNo})),
				rpnL:  (msb, lsb) => this._getRpnNrpn(makeKey({kind: 'rpn',  params: [msb, lsb, 1], partNo})),
				nrpnM: (msb, lsb) => this._getRpnNrpn(makeKey({kind: 'nrpn', params: [msb, lsb, 0], partNo})),
				nrpnL: (msb, lsb) => this._getRpnNrpn(makeKey({kind: 'nrpn', params: [msb, lsb, 1], partNo})),
			};
			return Object.freeze(part);
		}));

		for (let partNo = 0; partNo < this.parts.length; partNo++) {
			const part = this.parts[partNo];

			for (let noteNo = 0; noteNo < 128; noteNo++) {	// An: Polyphonic Key Pressure
				this._staticParams.set(makeKey({kind: 'a', param: noteNo, partNo}), part.notes[noteNo].pressure);
			}
			for (let ccNo = 0; ccNo < 128; ccNo++) {		// Bn: Control Change
				this._staticParams.set(makeKey({kind: 'b', param: ccNo, partNo}), part.ccs[ccNo]);
			}
			this._staticParams.set(makeKey({kind: 'c', partNo}), part.pc.progNo);	// Cn: Program Change
			this._staticParams.set(makeKey({kind: 'd', partNo}), part.pressure);	// Dn: Channel Pressure
			this._staticParams.set(makeKey({kind: 'e', partNo}), part.pitch);		// En: Pitch Bend Change
		}
	}

	_getRpnNrpn(key) {
		if (!this._dynamicParams.has(key)) {
			this._dynamicParams.set(key, new MidiValue());
		}
		return this._dynamicParams.get(key);
	}

	get ports() {
		return this._ports;
	}
	get parts() {
		return this._parts;
	}

	_getRxChannel(partNo, portNo = 0) {
		console.assert((0 <= partNo && partNo < this._parts.length), 'Invalid argument', {partNo});
		return (portNo === 0) ? partNo % 16 : -1;
	}

	_transposeNote(partNo, noteNo) {
		console.assert((0 <= partNo && partNo < this._parts.length), 'Invalid argument', {partNo});
		console.assert((0 <= noteNo && noteNo < 128), 'Invalid argument', {noteNo});
		return noteNo;
	}

	_updateModuleSpecificState(mes) {
		console.assert(mes, 'Invalid argument', {mes});
		return [];
	}

	_inputMidiMessage(bytes, portNo = 0) {
		console.assert(bytes && bytes.length);
		console.assert(portNo >= 0);
		console.assert((bytes[0] & 0x80) !== 0, 'Invalid MIDI message', {bytes});

		const mes = analyzeMidiMessage(bytes);
		if ('channelNo' in mes) {
			console.assert((bytes[0] & 0xf0) !== 0xf0);

			// Assigns the input message to each corresponding part according to its channel No.
			const messages = [];
			for (let partNo = 0; partNo < this._parts.length; partNo++) {
				const {channelNo, value} = mes;
				if (this._getRxChannel(partNo, portNo) !== mes.channelNo) {
					continue;
				}

				messages.push({...mes, partNo});
				const part = this._parts[partNo];

				// Handles RPN/NRPN-related messages.
				if (mes.kind === 'b') {
					const ccNo = mes.param;
					const ccs = part.ccs;

					switch (ccNo) {
					case 0x62:	// NRPN (LSB)
					case 0x63:	// NRPN (MSB)
						part.lastPN.value = 'nrpn';
						break;
					case 0x64:	// RPN (LSB)
					case 0x65:	// RPN (MSB)
						part.lastPN.value = 'rpn';
						break;

					case 0x06:	// Data Entry (MSB)
						if (part.lastPN.value === 'nrpn') {
							const mesNrpn = analyzeNrpn(ccs[0x63].value, ccs[0x62].value, value, 0);
							if (mesNrpn) {
								messages.push({...mesNrpn, channelNo, partNo, value, params: [ccs[0x63].value, ccs[0x62].value, 0]});
							}
						} else if (part.lastPN.value === 'rpn') {
							const mesRpn = analyzeRpn(ccs[0x65].value, ccs[0x64].value, value, 0);
							if (mesRpn) {
								messages.push({...mesRpn, channelNo, partNo, value, params: [ccs[0x65].value, ccs[0x64].value, 0]});
							}
						}
						break;

					case 0x26:	// Data Entry (LSB)
						if (part.lastPN.value === 'nrpn') {
							const mesNrpn = analyzeNrpn(ccs[0x63].value, ccs[0x62].value, ccs[0x06].value, value);
							if (mesNrpn) {
								messages.push({...mesNrpn, channelNo, partNo, value, params: [ccs[0x63].value, ccs[0x62].value, 1]});
							}
						} else if (part.lastPN.value === 'rpn') {
							const mesRpn = analyzeRpn(ccs[0x65].value, ccs[0x64].value, ccs[0x06].value, value);
							if (mesRpn) {
								messages.push({...mesRpn, channelNo, partNo, value, params: [ccs[0x65].value, ccs[0x64].value, 1]});
							}
						}
						break;

					case 0x60:	// Data Increment
					case 0x61:	// Data Decrement
						if (part.lastPN.value === 'nrpn') {
							const mesNrpn = analyzeNrpn(ccs[0x63].value, ccs[0x62].value, ccs[0x06].value, ccs[0x26].value);
							if (mesNrpn) {
								messages.push({...mesNrpn, channelNo, partNo, value, params: [ccs[0x63].value, ccs[0x62].value], delta: (ccNo === 0x60) ? +1 : -1});
							}
						} else if (part.lastPN.value === 'rpn') {
							const mesRpn = analyzeRpn(ccs[0x65].value, ccs[0x64].value, ccs[0x06].value, ccs[0x26].value);
							if (mesRpn) {
								messages.push({...mesRpn, channelNo, partNo, value, params: [ccs[0x65].value, ccs[0x64].value], delta: (ccNo === 0x60) ? +1 : -1});
							}
						}
						break;

					// no default
					}
				}
			}

			// Updates the parameters.
			for (const message of messages) {
				console.assert('kind' in message && 'value' in message && 'partNo' in message, JSON.stringify(message));	// TODO: support "delta" for RPN/NRPN.

				// Updates part parameters.
				const key = makeKey(message);
				if (message.kind.length === 1) {
					const part = this._parts[message.partNo];
					switch (message.kind) {
					case '9':
					case '8':
						{
							const noteNo = this._transposeNote(message.partNo, message.param);
							part.notes[noteNo].isOn = (message.value > 0 && message.kind === '8');
							part.notes[noteNo].velocity = message.value;
						}
						break;
					case 'c':
						part.pc.bankM = part.ccs[0x00].value;
						part.pc.bankL = part.ccs[0x20].value;
						/*FALLTHRU*/
					case 'b':
					case 'e':
					case 'd':
					case 'a':
						this._staticParams.get(key).value = message.value;
						break;
					default:
						console.assert(false);
						break;
					}

				} else if (/^n?rpn$/u.test(message.kind)) {
					if (this._dynamicParams.has(key)) {
						this._dynamicParams.get(key).value = message.value;
					} else {
						const newValue = new MidiValue();
						newValue.value = message.value;
						this._dynamicParams.set(key, newValue);
					}
				}

				// Makes the information of the result of the input message.
				message.results = [{key, value: message.value}];

				// If the CC No. is for MSB, clears the corresponding LSB to 0.
				if (message.kind === 'b' && message.param < 0x20) {
					const ccNoLsb = message.param + 0x20;
					message.results.push({key: makeKey({...message, param: ccNoLsb}), value: message.value, isInitialized: true});
					this._parts[message.partNo].ccs[ccNoLsb].init(0);
				}

				// Executes module specific behavior.
				const results = this._updateModuleSpecificState(message);
				if (results && results.length > 0) {
					 message.results.push(...results);
				}
			}

			return messages;

		} else {
			// Executes module specific behavior.
			const message = {...mes};
			const results = this._updateModuleSpecificState(message);
			if (results && results.length > 0) {
				message.results.push(...results);
			}

			return [message];
		}
	}
}

function getNewRunningStatus(statusByte, runningStatus) {
	console.assert((statusByte & 0x80) !== 0);

	if (statusByte < 0xf0) {
		return statusByte;
	} else if (statusByte < 0xf8) {
		return 0x00;
	} else {
		return runningStatus;
	}
}

function getMessageLength(statusByte) {
	if ((statusByte & 0x80) === 0) {
		return 0;
	}

	switch (statusByte & 0xf0) {
	case 0x80:	// Note Off
	case 0x90:	// Note On
	case 0xa0:	// Polyphonic Key Pressure
	case 0xb0:	// Control Change
	case 0xe0:	// Pitch Bend Change
		return 3;

	case 0xc0:	// Program Change
	case 0xd0:	// Channel Pressure
		return 2;

	default:
		console.assert((statusByte & 0xf0) === 0xf0);
		break;
	}

	switch (statusByte) {
	case 0xf1:	// MIDI Time Code Quarter Frame
	case 0xf3:	// Song Select
		return 2;

	case 0xf2:	// Song Position Pointer
		return 3;

	case 0xf5:	// (Port Select)
		return 2;

	case 0xf6:	// Tune Request
	case 0xf7:	// End of System Exclusive
	case 0xf8:	// Timing Clock
	case 0xfa:	// Start
	case 0xfb:	// Continue
	case 0xfc:	// Stop
	case 0xfe:	// Active Sensing
	case 0xff:	// System Reset
		return 1;

	case 0xf4:
	case 0xf9:
	case 0xfd:
		return 0;

	default:
		console.assert(statusByte === 0xf0);
		break;
	}

	return 0;
}

function makeKey(mes) {
	console.assert('kind' in mes && 'partNo' in mes, 'Invalid argument', {mes});

	let param = '';
	if ('param' in mes) {
		param = `_${mes.param}`;
	}
	if ('params' in mes) {
		param = `_${mes.params.map(((e) => String(e))).join('_')}`;
	}

	let part = '';
	if ('partNo' in mes) {
		part = `_${mes.partNo}p`;
	}

	return `${mes.kind}${param}${part}`;
}
