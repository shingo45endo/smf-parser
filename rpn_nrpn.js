/* eslint no-unused-vars: ["error", {"argsIgnorePattern": "value[ML]"}] */

const parsersRpn = {
	// Registered Parameters
	0x00: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x00);
		const mes = {
			0x00: {
				commandName: 'Pitch Bend Sensitivity',
				semitones: valueM,
				cents:     valueL,
			},
			0x01: {
				commandName: 'Master Fine Tune',
				value: (valueM << 7) | valueL,
			},
			0x02: {
				commandName: 'Master Coarse Tune',
				value: valueM,
			},
			0x03: {
				commandName: 'Tuning Program Change',
				value: valueM,
			},
			0x04: {
				commandName: 'Tuning Bank Change',
				value: valueM,
			},
			0x05: {
				commandName: 'Modulation Depth Range',
				semitones: valueM,
				cents:     valueL,
			},
		}[paramL];

		return mes;
	},

	// 3D Sound Controllers
	0x3d: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x3d);
		const mes = {
			0x00: {
				commandName: 'Azimuth Angle',
			},
			0x01: {
				commandName: 'Elevation Angle',
			},
			0x02: {
				commandName: 'Gain',
			},
			0x03: {
				commandName: 'Distance Ratio',
			},
			0x04: {
				commandName: 'Maximum Distance',
			},
			0x05: {
				commandName: 'Gain at Max Distance',
			},
			0x06: {
				commandName: 'Reference Distance Ratio',
			},
			0x07: {
				commandName: 'Pan Spread Angle',
			},
			0x08: {
				commandName: 'Roll Angle',
			},
		}[paramL];

		return (mes) ? {value: (valueM << 7) | valueL, ...mes} : null;
	},

	// RPN Null
	0x7f: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x7f);
		if (paramL === 0x7f) {
			return {
				commandName: 'RPN Null',
			};
		}

		return null;
	},
};

const parsersNrpn = {
	// Misc.
	0x00: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x00);
		return {
			0x00: {
				modelName:   'PLG-VH',
				commandName: 'Harmony Mute',
			},
			0x01: {
				modelName:   'SG01',
				commandName: 'Reverb Select',
			},
		}[paramL];
	},

	// GS/XG Part Settings
	0x01: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x01);
		const mes = {
			0x08: {
				modelName:   'GS/XG',
				commandName: 'Vibrato Rate',
			},
			0x09: {
				modelName:   'GS/XG',
				commandName: 'Vibrato Depth',
			},
			0x0a: {
				modelName:   'GS/XG',
				commandName: 'Vibrato Delay',
			},
			0x1a: {
				modelName:   'PLG-VH',
				commandName: 'Detune Modulation',
			},
			0x20: {
				modelName:   'GS/XG',
				commandName: 'Filter Cutoff Frequency',
			},
			0x21: {
				modelName:   'GS/XG',
				commandName: 'Filter Resonance',
			},
			0x22: {
				modelName:   'PLG-VL',
				commandName: 'Filter EG Depth',
			},
			0x24: {
				modelName:   'XG',
				commandName: 'HPF Cutoff Frequency',
			},
			0x25: {
				modelName:   'XG',
				commandName: 'HPF Resonance (reserved)',
			},
			0x30: {
				modelName:   'XG',
				commandName: 'EQ Bass Gain',
			},
			0x31: {
				modelName:   'XG',
				commandName: 'EQ Treble Gain',
			},
			0x32: {
				modelName:   'XG',
				commandName: 'EQ Mid-Bass Gain (reserved)',
			},
			0x33: {
				modelName:   'XG',
				commandName: 'EQ Mid-Treble Gain (reserved)',
			},
			0x34: {
				modelName:   'XG',
				commandName: 'EQ Bass Frequency',
			},
			0x35: {
				modelName:   'XG',
				commandName: 'EQ Treble Frequency',
			},
			0x36: {
				modelName:   'XG',
				commandName: 'EQ Mid-Bass Frequency (reserved)',
			},
			0x37: {
				modelName:   'XG',
				commandName: 'EQ Mid-Treble Frequency (reserved)',
			},
/*
			0x38: {
				modelName:   'XG',
				commandName: 'EQ (reserved)',
			},
			0x39: {
				modelName:   'XG',
				commandName: 'EQ (reserved)',
			},
			0x3a: {
				modelName:   'XG',
				commandName: 'EQ (reserved)',
			},
			0x3b: {
				modelName:   'XG',
				commandName: 'EQ (reserved)',
			},
			0x3c: {
				modelName:   'XG',
				commandName: 'EQ (reserved)',
			},
			0x3d: {
				modelName:   'XG',
				commandName: 'EQ (reserved)',
			},
			0x3e: {
				modelName:   'XG',
				commandName: 'EQ (reserved)',
			},
			0x3f: {
				modelName:   'XG',
				commandName: 'EQ (reserved)',
			},
*/
			0x63: {
				modelName:   'GS/XG',
				commandName: 'Envelope Attack Time',
			},
			0x64: {
				modelName:   'GS/XG',
				commandName: 'Envelope Decay Time',
			},
			0x66: {
				modelName:   'GS/XG',
				commandName: 'Envelope Release Time',
			},
		}[paramL];

		return mes;
	},

	// PLG100-VH Harmony Settings
	0x02: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x02);
		const kind = (paramL & 0xf0) >> 4;
		const index = paramL & 0x0f;
		if ((0 <= kind && kind < 3) && (0 <= index && index < 3)) {
			return {
				modelName:   'PLG100-VH',
				commandName: `Harmony ${index + 1} ${['Volume', 'Panpot', 'Detune'][kind]}`,
			};
		} else {
			return null;
		}
	},

	// GS/XG Drum Settings
	0x14: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x14);
		return {
			modelName:   'XG',
			commandName: 'Drum Filter Cutoff Frequency',
			noteNo:      paramL,
		};
	},
	0x15: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x15);
		return {
			modelName:   'XG',
			commandName: 'Drum Filter Resonance',
			noteNo:      paramL,
		};
	},
	0x16: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x16);
		return {
			modelName:   'XG',
			commandName: 'Drum EG Attack Rate',
			noteNo:      paramL,
		};
	},
	0x17: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x17);
		return {
			modelName:   'XG',
			commandName: 'Drum EG Decay Rate',
			noteNo:      paramL,
		};
	},
	0x18: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x18);
		return {
			modelName:   'GS/XG',
			commandName: 'Drum Instrument Pitch Coarse',
			noteNo:      paramL,
		};
	},
	0x19: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x19);
		return {
			modelName:   'XG',
			commandName: 'Drum Instrument Pitch Fine',
			noteNo:      paramL,
		};
	},
	0x1a: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x1a);
		return {
			modelName:   'GS/XG',
			commandName: 'Drum Instrument Level',
			noteNo:      paramL,
		};
	},
	0x1c: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x1c);
		return {
			modelName:   'GS/XG',
			commandName: 'Drum Instrument Panpot',
			noteNo:      paramL,
		};
	},
	0x1d: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x1d);
		return {
			modelName:   'GS/XG',
			commandName: 'Drum Instrument Reverb Send Level',
			noteNo:      paramL,
		};
	},
	0x1e: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x1e);
		return {
			modelName:   'GS/XG',
			commandName: 'Drum Instrument Chorus Send Level',
			noteNo:      paramL,
		};
	},
	0x1f: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x1f);
		return {
			modelName:   'GS/XG',
			commandName: 'Drum Instrument Delay/Var. Send Level',
			noteNo:      paramL,
		};
	},
	0x24: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x24);
		return {
			modelName:   'XG',
			commandName: 'Drum HPF Cutoff Frequency',
			noteNo:      paramL,
		};
	},
	0x25: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x25);
		return {
			modelName:   'XG',
			commandName: 'Drum HPF Resonance (reserved)',
			noteNo:      paramL,
		};
	},
	0x30: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x30);
		return {
			modelName:   'XG',
			commandName: 'Drum EQ Bass Gain',
			noteNo:      paramL,
		};
	},
	0x31: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x31);
		return {
			modelName:   'XG',
			commandName: 'Drum EQ Treble Gain',
			noteNo:      paramL,
		};
	},
	0x32: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x32);
		return {
			modelName:   'XG',
			commandName: 'Drum EQ Mid-Bass Gain (reserved)',
			noteNo:      paramL,
		};
	},
	0x33: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x33);
		return {
			modelName:   'XG',
			commandName: 'Drum EQ Mid-Treble Gain (reserved)',
			noteNo:      paramL,
		};
	},
	0x34: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x34);
		return {
			modelName:   'XG',
			commandName: 'Drum EQ Bass Frequency',
			noteNo:      paramL,
		};
	},
	0x35: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x35);
		return {
			modelName:   'XG',
			commandName: 'Drum EQ Treble Frequency',
			noteNo:      paramL,
		};
	},
	0x36: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x36);
		return {
			modelName:   'XG',
			commandName: 'Drum EQ Mid-Bass Frequency (reserved)',
			noteNo:      paramL,
		};
	},
/*
	0x37: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x37);
		return {
			modelName:   'XG',
			commandName: 'Drum Mid-Treble Frequency (reserved)',
			noteNo:      paramL,
		};
	},
*/
	0x40: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x40);
		return {
			modelName:   'XG',
			commandName: 'Drum Velocity Pitch Sens.',
			noteNo:      paramL,
		};
	},
	0x41: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x41);
		return {
			modelName:   'XG',
			commandName: 'Drum Velocity LPF Cutoff Sens.',
			noteNo:      paramL,
		};
	},

	// Dream SAM
	// Note: Some mid/high range of SAM chips have different NRPN assignments on 0x37xx and support another NRPNs whose MSBs are 0x02xx-0x0dxx.
	// But, this NRPN parser only supports low-cost SAM chip models for example SAM2635, SAM2695, SAM2195, and so on.
	0x37: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x37);
		const mes = {
			0x00: {
				commandName: 'Equalizer Low Band (Bass)',
			},
			0x01: {
				commandName: 'Equalizer Med Low Band',
			},
			0x02: {
				commandName: 'Equalizer Med High Band',
			},
			0x03: {
				commandName: 'Equalizer High Band (Treble)',
			},
			0x07: {
				commandName: 'Master Volume',
			},
			0x08: {
				commandName: 'Equalizer Low Cutoff Freq',
			},
			0x09: {
				commandName: 'Equalizer Med Low Cutoff Freq',
			},
			0x0a: {
				commandName: 'Equalizer Med High Cutoff Freq',
			},
			0x0b: {
				commandName: 'Equalizer High Cutoff Freq',
			},
			0x13: {
				commandName: 'Clipping Mode Select',
			},
			0x15: {
				commandName: 'General MIDI Reverb Send',
			},
			0x16: {
				commandName: 'General MIDI Chorus Send',
			},
			0x18: {
				commandName: 'Post Effects Applied on GM',
			},
			0x19: {
				commandName: 'Post Effects Applied on Mic',
			},
			0x1a: {
				commandName: 'Post Effects Applied on Reverb/Chorus',
			},
			0x20: {
				commandName: 'Spatial Effect Volume',
			},
			0x22: {
				commandName: 'General MIDI Volume',
			},
			0x23: {
				commandName: 'General MIDI Pan',
			},
			0x24: {
				commandName: 'Mic Volume',
			},
			0x26: {
				commandName: 'Mic Pan',
			},
			0x28: {
				commandName: 'Mic Echo Level',
			},
			0x29: {
				commandName: 'Mic Echo Time',
			},
			0x2a: {
				commandName: 'Mic Echo Feedback',
			},
			0x2c: {
				commandName: 'Spatial Effect Delay',
			},
			0x2d: {
				commandName: 'Spatial Effect Input',
			},
			0x30: {
				commandName: 'Slave 1 Echo Volume Right',
			},
			0x31: {
				commandName: 'Slave 1 Echo Volume Left',
			},
			0x32: {
				commandName: 'Slave 2 Echo Volume Right',
			},
			0x33: {
				commandName: 'Slave 2 Echo Volume Left',
			},
			0x34: {
				commandName: 'Master Echo Volume Right',
			},
			0x35: {
				commandName: 'Master Echo Volume Left',
			},
			0x3c: {
				commandName: 'Mic Pitch Shift',
			},
			0x41: {
				commandName: 'Mic Key Detect Latency',
			},
			0x51: {
				commandName: 'Auto-test',
			},
			0x55: {
				commandName: 'Effects On/Off',
			},
			0x56: {
				commandName: 'Audio In Functions On/Off',
			},
			0x57: {
				commandName: 'System Exclusive Device ID',
			},
			0x5f: {
				commandName: 'Effects On/Off Polyphony Select',
			},
		}[paramL];

		return (mes) ? {modelName: 'DreamSAM', ...mes} : null;
	},

	// Hyper Canvas / TTS-1
	0x58: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x58);
		let mes = {
			0x01: {
				commandName: 'Character',
			},
			0x20: {
				commandName: 'Tone Control Switch',
			},
			0x22: {
				commandName: 'Tone Control Bass Gain',
			},
			0x24: {
				commandName: 'Tone Control Treble Gain',
			},
			0x27: {
				commandName: 'Tone Control Mid Gain',
			},
			0x40: {
				commandName: 'Reverb Switch',
			},
			0x41: {
				commandName: 'Reverb Type',
			},
			0x42: {
				commandName: 'Reverb Time',
			},
			0x50: {
				commandName: 'Chorus Switch',
			},
			0x51: {
				commandName: 'Chorus Type',
			},
			0x52: {
				commandName: 'Chorus Rate',
			},
			0x53: {
				commandName: 'Chorus Depth',
			},
			0x54: {
				commandName: 'Chorus Feedback',
			},
			0x55: {
				commandName: 'Chorus Send to Reverb',
			},
			0x70: {
				commandName: 'Master Volume',
			},
			0x71: {
				commandName: 'Master Tuning',
			},
			0x72: {
				commandName: 'Master Key Shift',
			},
			0x7f: {
				commandName: 'System Reset',
			},
		}[paramL];

		if (!mes) {
			if (0x30 <= paramL && paramL <= 0x3b) {
				mes = {
					commandName: `Scale Tune ${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][paramL - 0x30]}`,
				};
			}
		}

		return (mes) ? {modelName: 'Hyper Canvas', ...mes} : null;
	},

	// NSX-1 Vocal Part Settings
	0x70: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x70);
		const mes = {
			0x01: {
				commandName: 'Enable Auto Pitch Control',
			},
			0x02: {
				commandName: 'Enable Auto Dynamics Control',
			},
			0x03: {
				commandName: 'Vibrato Type',
			},
			0x04: {
				commandName: 'Vibrato Rate',
			},
			0x05: {
				commandName: 'Reserved',
			},
			0x06: {
				commandName: 'Reserved',
			},
			0x07: {
				commandName: 'Vibrato Delay',
			},
			0x08: {
				commandName: 'Portamento Timing',
			},
			0x09: {
				commandName: 'Seek',
			},
			0x0a: {
				commandName: 'White Noise Control',
			},
			0x0c: {
				commandName: 'Phoneme Unit Connect Type',
			},
		}[paramL];

		return (mes) ? {modelName: 'NSX-1', ...mes} : null;
	},

	// NSX-1 Phonetic Symbols
	0x71: (paramM, paramL, valueM, valueL) => {
		console.assert(paramM === 0x71);
		const mes = {
			0x12: {
				commandName: 'Start of Phonetic Symbols',
			},
			0x13: {
				commandName: 'Phonetic Symbol',
			},
			0x4f: {
				commandName: 'End of Phonetic Symbols',
			},
		}[paramL];

		return (mes) ? {modelName: 'NSX-1', ...mes} : null;
	},

	// EMU8000
	0x7d: handleEmu8000Nrpn,
	0x7e: handleEmu8000Nrpn,
	0x7f: handleEmu8000Nrpn,
};

function handleEmu8000Nrpn(paramM, paramL, valueM, valueL) {
	console.assert(paramM === 0x7f || paramM === 0x7e || paramM === 0x7d);
	// TODO: Implement calculation of actual value for each NRPN parameter.
	const mes = {
		0x00: {
			commandName: 'Delay before LFO1 Starts',
		},
		0x01: {
			commandName: 'LFO1 Frequency',
		},
		0x02: {
			commandName: 'Delay before LFO2 Starts',
		},
		0x03: {
			commandName: 'LFO2 Frequency',
		},
		0x04: {
			commandName: 'Envelope 1 Delay Time',
		},
		0x05: {
			commandName: 'Envelope 1 Attack Time',
		},
		0x06: {
			commandName: 'Envelope 1 Hold Time',
		},
		0x07: {
			commandName: 'Envelope 1 Decay Time',
		},
		0x08: {
			commandName: 'Envelope 1 Sustain Level',
		},
		0x09: {
			commandName: 'Envelope 1 Release Time',
		},
		0x0a: {
			commandName: 'Envelope 2 Delay Time',
		},
		0x0b: {
			commandName: 'Envelope 2 Attack Time',
		},
		0x0c: {
			commandName: 'Envelope 2 Hold Time',
		},
		0x0d: {
			commandName: 'Envelope 2 Decay Time',
		},
		0x0e: {
			commandName: 'Envelope 2 Sustain Level',
		},
		0x0f: {
			commandName: 'Envelope 2 Release Time',
		},
		0x10: {
			commandName: 'Initial Pitch',
		},
		0x11: {
			commandName: 'LFO1 to Pitch',
		},
		0x12: {
			commandName: 'LFO2 to Pitch',
		},
		0x13: {
			commandName: 'Envelope 1 to Pitch',
		},
		0x14: {
			commandName: 'LFO1 to Volume',
		},
		0x15: {
			commandName: 'Initial Filter Cutoff',
		},
		0x16: {
			commandName: 'Initial Filter Resonance Coefficient',
		},
		0x17: {
			commandName: 'LFO1 to Filter Cutoff',
		},
		0x18: {
			commandName: 'Envelope 1 to Filter Cutoff',
		},
		0x19: {
			commandName: 'Chorus Effects Send',
		},
		0x1a: {
			commandName: 'Reverb Effects Send',
		},
	}[paramL];

	return (mes) ? {modelName: 'EMU8000', ...mes} : null;
}

export const [analyzeRpn, analyzeNrpn] = ['rpn', 'nrpn'].map((kind) => {
	const parsers = {
		rpn:  parsersRpn,
		nrpn: parsersNrpn,
	}[kind];

	return (paramM, paramL, valueM, valueL) => {
		if ([paramM, paramL, valueM, valueL].some((e) => !Number.isInteger(e) || (e < 0 || 128 <= e))) {
			return null;
		}

		const mes = {
			kind,
			commandName: (kind === 'rpn') ? 'Unknown RPN Parameter' : `NRPN Parameter (MSB: ${paramM} / LSB: ${paramL})`,
			values: [valueM, valueL],
//			params: [paramM, paramL],
		};

		if (parsers[paramM]) {
			const result = parsers[paramM](paramM, paramL, valueM, valueL);
			if (result) {
				Object.assign(mes, result);
			}
		}

		return mes;
	};
});
