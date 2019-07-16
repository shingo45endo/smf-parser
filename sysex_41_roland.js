import {addSysExParsers, bytesToHex, stripEnclosure, checkSumError} from './sysex_instance.js';

const modelProps = [
	// MT-32, CM-32L, CM-32P, and CM-64 (including D-10/110, D-20, D-5, and GR-50)
	{
		modelId: 0x16,
		modelName: 'CM-64',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',	// Some modules might not accept 11h-1fh.
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],	// CM-32P (and CM-64 PCM part) only supports DT1.
		addrLen: 3,
	},
	// SC-55, SC-55mkII, SC-88, SC-88Pro, SC-8820, SC-8850, and so on
	{
		modelId: 0x42,
		modelName: 'GS',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// LCD for Sound Canvas series
	{
		modelId: 0x45,
		modelName: 'SC LCD',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// SC-7 (GM Sound Module)
	{
		modelId: 0x56,
		modelName: 'SC-7',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	},

	// S-10 (Digital Sampling Keyboard)
	// MKS-100 (Digital Sampler)
	{
		modelId: 0x10,
		modelName: 'S-10',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	},
	// GM-70 (Guitar-MIDI Interface)
	{
		modelId: 0x11,
		modelName: 'GM-70',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// DEP-3 (Digital Effects Processor)
	{
		modelId: 0x12,
		modelName: 'DEP-3',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// GP-8 (Guitar Effects Processor)
	{
		modelId: 0x13,
		modelName: 'GP-8',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	},
	// D-50/D-550, and D-05 (Linear Synthesizer)
	// VC-1 (V-Card "D-50 for V-Synth/VariOS")
	{
		modelId: 0x14,
		modelName: 'D-50',
		deviceId: 0x00,
		deviceIdRegexp: '(?:0[0-9a-f]|10)',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	},
	// S-50 (Digital Sampling Keyboard)
	{
		modelId: 0x18,
		modelName: 'S-50',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	},
	// PM-16 (Pad MIDI Interface)
	{
		modelId: 0x19,
		modelName: 'PM-16',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// C-50/20, C-80 (Harpsichord)
	// C-280 (Organ)
	// DP-970, DP-900/700, F-30, F-50, F-90, F-100, FP-1, FP-8, FP-9, RP-80 (Digital Piano)
	// HP-1000S, HP-145, HP-147/R, HP-1700/900, HP-2/3/7, HP-237, HP-330/530/245, HP-2500, HP-2700/3700, HP-2800/3800, HP-2880, HP-3500S/4000S/5000S, HP-600/700/800, HP-103 (Digital Piano)
	// KR-33, KR-55 (Digital Keyboard)
	{
		modelId: 0x1a,
		modelName: 'Piano',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// R-880 (Digital Reverb)
	{
		modelId: 0x1b,
		modelName: 'R-880',
		deviceId: 0x00,
		deviceIdRegexp: '(?:0[0-9a-f]|7f)',
		commands: [0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	},
	// TR-626 (Rhythm Composer)
	{
		modelId: 0x1d,
		modelName: 'TR-626',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// S-550, S-330 (Digital Sampler)
	{
		modelId: 0x1e,
		modelName: 'S-550',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 4,
	},
	// ME-5 (Guitar Multiple Effects)
	{
		modelId: 0x1f,
		modelName: 'ME-5',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	},
	// A-880 (MIDI Patcher/Mixer)
	{
		modelId: 0x20,
		modelName: 'A-880',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 1,
	},
	// P-330 (Digital Piano)
	{
		modelId: 0x22,
		modelName: 'P-330',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// U-110 (PCM Sound Module)
	{
		modelId: 0x23,
		modelName: 'U-110',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// E-660 (Parametric Equalizer)
	{
		modelId: 0x24,
		modelName: 'E-660',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// PAD-80 (MIDI Pad Controller)
	{
		modelId: 0x25,
		modelName: 'PAD-80',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',	// Not confirmed
		commands: [0x12],
		addrLen: 3,
	},
	// GS-6 (Guitar Sound System)
	{
		modelId: 0x26,
		modelName: 'GS-6',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	},
	// A-50, A-80 (MIDI Keyboard Controller)
	{
		modelId: 0x27,
		modelName: 'A-50/80',
		deviceId: 0x00,
		commands: [0x12],
		addrLen: 3,
	},
	// FC-100mkII (Foot Controller)
	{
		modelId: 0x29,
		modelName: 'FC-100mkII',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 1,
	},
	// GP-16 (Guitar Effects Processor)
	{
		modelId: 0x2a,
		modelName: 'GP-16',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	},
	// U-220 (RS-PCM Sound Module)
	// U-20 (RS-PCM Keyboard)
	{
		modelId: 0x2b,
		modelName: 'U-220',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// CA-30 (Intelligent Arranger)
	// RA-50 (Realtime Arranger)
	{
		modelId: 0x2d,
		modelName: 'CA-30/RA-50',
		deviceId: 0x1f,
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// KR-500 (Digital Keyboard)
	{
		modelId: 0x2e,
		modelName: 'KR-500',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// Rodgers 445/702 (Organ)
	{
		modelId: 0x30,
		modelName: 'Rodgers 445/702',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// PRO-E (Intelligent Arranger)
	{
		modelId: 0x31,
		modelName: 'PRO-E',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// E-5 (Intelligent Synthesizer)
	// KR-100 (Digital Keyboard)
	{
		modelId: 0x32,
		modelName: 'E-5',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// E-30 (Intelligent Synthesizer)
	{
		modelId: 0x33,
		modelName: 'E-30',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// S-770, S-760 (Digital Sampler)
	// SP-700 (16-bit Sample Player)
	{
		modelId: 0x34,
		modelName: 'S-770',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 4,
	},
	// Rhodes Model 660/760
	{
		modelId: 0x35,
		modelName: 'Rhodes 660/760',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// R-8M (Total Percussion Sound Module)
	{
		modelId: 0x36,
		modelName: 'R-8M',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// SE-50 (Stereo Effects Processor)
	{
		modelId: 0x37,
		modelName: 'SE-50',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// RSP-550 (Stereo Signal Processor)
	{
		modelId: 0x38,
		modelName: 'RSP-550',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// D-70 (Super LA Synthesizer)
	{
		modelId: 0x39,
		modelName: 'D-70',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	},
	// D2 Quick, MC-307 Quick, MC-505 Quick, JX-305 Quick
	{
		modelId: 0x3a,
		modelName: 'Quick',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// SPD-8 (Total Percussion Pad)
	{
		modelId: 0x3b,
		modelName: 'SPD-8',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// JD-800 (Programmable Synthesizer)
	{
		modelId: 0x3d,
		modelName: 'JD-800',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// JX-1 (Performance Synthesizer)
	{
		modelId: 0x3e,
		modelName: 'JX-1',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// E-70 (Intelligent Synthesizer)
	{
		modelId: 0x3f,
		modelName: 'E-70',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// SSC-8004 (Sound Space Controller)
	{
		modelId: 0x43,
		modelName: 'SSC-8004',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// A-220 (MIDI Separator)
	{
		modelId: 0x44,
		modelName: 'A-220',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	},
	// JV-80 (Multi Timbral Synthesizer)
	// JV-880 (Multi Timbral Synthesizer Module)
	// JV-90 (Expandable Synthesizer)
	// JV-1000 (Music Workstation)
	// M-GS64, M-OC1, M-VS1, M-DC1, M-SE1 (Sound Expansion series)
	{
		modelId: 0x46,
		modelName: 'JV-880',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VK-1000 (Rhodes Organ)
	{
		modelId: 0x48,
		modelName: 'VK-1000',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// ME-10 (Guitar Multiple Effects)
	{
		modelId: 0x49,
		modelName: 'ME-10',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// A-30 (Keyboard Controller)
	{
		modelId: 0x4c,
		modelName: 'A-30',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	},
	// JV-30 (16 Part Multi Timbral Synthesizer)
	// JV-50/35 (Expandable Synthesizer)
	{
		modelId: 0x4d,
		modelName: 'JV-30',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// FG-1000/10 (Music Timer)
	{
		modelId: 0x4f,
		modelName: 'FG-1000',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// DR-660 (Dr. Rhythm)
	{
		modelId: 0x52,
		modelName: 'DR-660',
		deviceId: 0x09,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// DJ-70 (Sampling Workstation)
	{
		modelId: 0x53,
		modelName: 'DJ-70',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 4,
	},
	// GR-1 (Guitar Synthesizer)
	{
		modelId: 0x54,
		modelName: 'GR-1',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// SC-33 (for single mode)
	{
		modelId: 0x55,
		modelName: 'SC-33',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// JD-990 (Super JD Synthesizer Module)
	{
		modelId: 0x57,
		modelName: 'JD-990',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-7 (Percussion Sound Module)
	{
		modelId: 0x58,
		modelName: 'TD-7',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SRV-330 (Dimensional Space Reverb)
	{
		modelId: 0x59,
		modelName: 'SRV-330',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// SDE-330 (Dimensional Space Delay)
	{
		modelId: 0x5a,
		modelName: 'SDE-330',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// R-8MKII (Human Rhythm Composer)
	{
		modelId: 0x5e,
		modelName: 'R-8MKII',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// JS-30 (Sampling Workstation)
	{
		modelId: 0x5f,
		modelName: 'JS-30',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 4,
	},
	// SPD-11 (Total Percussion Pad)
	{
		modelId: 0x60,
		modelName: 'SPD-11',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SE-70 (Super Effects Processor)
	{
		modelId: 0x61,
		modelName: 'SE-70',
		deviceId: 0x00,
		deviceIdRegexp: '(?:0[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// AT-900/900C/800/500/350C/300/100/75/ATUP-E, AT90S/80S, AT-15 (Organ)
	// V-Combo VR-09/730 (for Mode 2)
	{
		modelId: 0x62,
		modelName: 'ATELIER',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// P-55 (Piano Module)
	{
		modelId: 0x63,
		modelName: 'P-55',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// MCR-8 (Multi Controller)
	{
		modelId: 0x64,
		modelName: 'MCR-8',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 1,
	},
	// DR-5 (Dr. Rhythm)
	{
		modelId: 0x65,
		modelName: 'DR-5',
		deviceId: 0x09,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// SDX-330 (Dimensional Expander)
	{
		modelId: 0x66,
		modelName: 'SDX-330',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',	// Note: The MIDI implementation chart said that the range is "00h-1Eh".
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// GR-09 (Guitar Synthesizer)
	{
		modelId: 0x67,
		modelName: 'GR-09',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// RV-70 (Digital Stereo Reverb)
	{
		modelId: 0x69,
		modelName: 'RV-70',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// JV-1080, JV-2080, JV-1010 (64 Voice Synthesizer Module)
	// XP-50, XP-80/60 (Music Workstation)
	// XP-30 (64 Voice Expandable Synthesizer)
	{
		modelId: 0x6a,
		modelName: 'JV-1080',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],	// Some modules only support DT1.
		addrLen: 4,
	},
	// RD-500 (Digital Piano)
	{
		modelId: 0x6b,
		modelName: 'RD-500',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// Rodgers 520/530 (Organ)
	{
		modelId: 0x6d,
		modelName: 'Rodgers 520/530',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// TD-5 (Percussion Sound Module)
	{
		modelId: 0x6e,
		modelName: 'TD-5',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GI-10 (Guitar-MIDI Interface)
	{
		modelId: 0x70,
		modelName: 'GI-10',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// GP-100 (Guitar Preamp Processor)
	{
		modelId: 0x71,
		modelName: 'GP-100',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// FC-200 (Foot Controller)
	{
		modelId: 0x72,
		modelName: 'FC-200',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	},
	// AP-700 (Advanced Equalizing Processor)
	{
		modelId: 0x73,
		modelName: 'AP-700',
		deviceId: 0x00,
		deviceIdRegexp: '[0-7][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// VG-8 (V-Guitar System)
	{
		modelId: 0x74,
		modelName: 'VG-8',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
/*
	// VG8-EX (V-Guitar System)
	{
		modelId: 0x74,	// Same Model ID, but different size of address...
		modelName: 'VG-8EX',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
*/
	// MS-1 (Digital Sampler)
	{
		modelId: 0x75,
		modelName: 'MS-1',
		deviceId: 0x10,
		commands: [],	// Note: According to the manual, bulk dump of MS-1 seems not to have DT1 (0x12).
		addrLen: 0,
	},
	// AR-2000 (Audio Recorder)
	{
		modelId: 0x76,
		modelName: 'AR-2000',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	},
	// RA-30 (Realtime Arranger)
	{
		modelId: 0x77,
		modelName: 'RA-30',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// GX-700 (Guitar Sound System)
	{
		modelId: 0x79,
		modelName: 'GX-700',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SX-700 (Studio Effects Processor)
	{
		modelId: 0x7a,
		modelName: 'SX-700',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// XP-10 (Multitimbral Synthesizer)
	{
		modelId: 0x7b,
		modelName: 'XP-10',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// VS-880 (Digital Studio Workstation)
	{
		modelId: 0x7c,
		modelName: 'VS-880',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// A-90 (Expandable Controller)
	{
		modelId: 0x7d,
		modelName: 'A-90',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SN-700 (Noise/Hum Eliminator)
	{
		modelId: [0x00, 0x01],
		modelName: 'SN-700',
		deviceId: 0x00,
		deviceIdRegexp: '[0-7][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// A-33 (MIDI Keyboard Controller)
	// PK-6, PK-9 (Dynamic MIDI Pedal)
	{
		modelId: [0x00, 0x02],
		modelName: 'A-33',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	},
	// MC-303 (groovebox)
	{
		modelId: [0x00, 0x03],
		modelName: 'MC-303',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GT-5 (Guitar Effects Processor)
	{
		modelId: [0x00, 0x04],
		modelName: 'GT-5',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// PMA-5 (Personal Music Assistant)
	{
		modelId: [0x00, 0x05],
		modelName: 'PMA-5',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// JP-8000 (Synthesizer)
	// JP-8080 (Synthesizer Module)
	{
		modelId: [0x00, 0x06],
		modelName: 'JP-8000',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GR-30 (Guitar Synthesizer)
	{
		modelId: [0x00, 0x07],
		modelName: 'GR-30',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VK-7 (Organ)
	// PK-7A, PK-25A�iMIDI Pedal Keyboard)
	{
		modelId: [0x00, 0x08],
		modelName: 'VK-7',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// RD-600 (Digital Piano)
	{
		modelId: [0x00, 0x09],
		modelName: 'RD-600',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-10 (Percussion Sound Module)
	{
		modelId: [0x00, 0x0a],
		modelName: 'TD-10',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 4,
	},
	// D2, MC-307, MC-505 (groovebox)
	// JX-305 (groovesynth)
	{
		modelId: [0x00, 0x0b],
		modelName: 'groove',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SPD-20 (Total Percussion Pad)
	{
		modelId: [0x00, 0x0d],
		modelName: 'SPD-20',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VS-1680 (24-bit Digital Studio Workstation)
	{
		modelId: [0x00, 0x0e],
		modelName: 'VS-1680',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// SP-808 (groovesampler)
	{
		modelId: [0x00, 0x0f],
		modelName: 'SP-808',
		commands: [],
		addrLen: 0,
	},
	// XV-3080, XV-88, XV-5080, XV-5050, XV-2020
	// FA-76 (Fantom)
	{
		modelId: [0x00, 0x10],
		modelName: 'XV-5080',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SRV-3030/3030D (24bit Digital Reverb)
	{
		modelId: [0x00, 0x12],
		modelName: 'SRV-3030',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '[0-7][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// DR-202 (Dr. Rhythm)
	{
		modelId: [0x00, 0x13],
		modelName: 'DR-202',
		deviceId: 0x11,	// From an example SysEx in the users manual
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VS-880EX (Digital Studio Workstation)
	{
		modelId: [0x00, 0x14],
		modelName: 'VS-880EX',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// VM-3100/3100Pro (V-Mixing Station)
	{
		modelId: [0x00, 0x15],
		modelName: 'VM-3100',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// VK-77 (Combo Organ)
	{
		modelId: [0x00, 0x1a],
		modelName: 'VK-77',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GT-3 (Guitar Effects Processor)
	{
		modelId: [0x00, 0x1b],
		modelName: 'GT-3',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// DR-770 (Dr. Rhythm)
	{
		modelId: [0x00, 0x1c],
		modelName: 'DR-770',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VP-9000 (VariPhrase Processor)
	// VariOS (Open System Module)
	{
		modelId: [0x00, 0x1d],
		modelName: 'VP-9000',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VM-7200/7100 and VM-C7200/C7100 (V-Mixing Station)
	{
		modelId: [0x00, 0x1e],
		modelName: 'VM-7200',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// TD-8 (Percussion Sound Module)
	{
		modelId: [0x00, 0x20],
		modelName: 'TD-8',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VF-1 (24-bit Multiple Effects Processor)
	{
		modelId: [0x00, 0x23],
		modelName: 'VF-1',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// VG-88 (V-Guitar System)
	{
		modelId: [0x00, 0x27],
		modelName: 'VG-88',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VSR-880 (24-bit Digital Studio Recorder)
	{
		modelId: [0x00, 0x29],
		modelName: 'VSR-880',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// VS-1880, VS-1824 (24-bit Digital Studio Workstation)
	{
		modelId: [0x00, 0x2a],
		modelName: 'VS-1880',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// SP-808EX (e-MIX STUDIO)
	{
		modelId: [0x00, 0x2b],
		modelName: 'SP-808EX',
		commands: [],
		addrLen: 0,
	},
	// HandSonic HPD-15 (Hand Percussion Pad)
	{
		modelId: [0x00, 0x2e],
		modelName: 'HPD-15',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VS-890 (24-bit Digital Studio Workstation)
	{
		modelId: [0x00, 0x2f],
		modelName: 'VS-890',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// GR-33 (Guitar Synthesizer)
	{
		modelId: [0x00, 0x30],
		modelName: 'GR-33',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SRQ-2031/RDQ-2031 (Digital Graphic Equalizer)
	{
		modelId: [0x00, 0x31],
		modelName: 'SRQ-2031',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// SRQ-4015/RDQ-4015 (Digital Graphic Equalizer)
	{
		modelId: [0x00, 0x32],
		modelName: 'SRQ-4015',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// EF-303 (Groove Effects)
	{
		modelId: [0x00, 0x33],
		modelName: 'EF-303',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VGA-7 (V-Guitar Amplifier)
	{
		modelId: [0x00, 0x34],
		modelName: 'VGA-7',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 4,
	},
	// JS-5 (Jam Station)
	{
		modelId: [0x00, 0x35],
		modelName: 'JS-5',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VE-7000 (CH Edit Controller)
	{
		modelId: [0x00, 0x36],
		modelName: 'VE-7000',
		deviceId: 0x7f,
		commands: [0x12],
		addrLen: 3,
	},
	// AR-3000 (Audio Recorder)
	{
		modelId: [0x00, 0x37],
		modelName: 'AR-3000',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// AR-200 (Audio Recorder)
	{
		modelId: [0x00, 0x38],
		modelName: 'AR-200',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// SP-505 (Groove Sampling Workstation)
	{
		modelId: [0x00, 0x39],
		modelName: 'SP-505',
		commands: [],
		addrLen: 0,
	},
	// FP-3 (Digital Piano)
	{
		modelId: [0x00, 0x3a],
		modelName: 'FP-3',
		commands: [],
	},
	// CDX-1 (Multitrack CD Recorder/Audio Sample Workstation)
	{
		modelId: [0x00, 0x3b],
		modelName: 'CDX-1',
		commands: [],
	},
	// RS-5/9 (64 Voice Synthesizer)
	{
		modelId: [0x00, 0x3c],
		modelName: 'RS-9',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-6, TD-6V (Percussion Sound Module)
	{
		modelId: [0x00, 0x3f],
		modelName: 'TD-6',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VS-2480/2480CD (24Tr/24-bit/96kHz Digital Studio Workstation)
	{
		modelId: [0x00, 0x40],
		modelName: 'VS-2480',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// DR-670 (Dr. Rhythm)
	{
		modelId: [0x00, 0x41],
		modelName: 'DR-670',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 5,
	},
	// RD-700 (Digital Piano)
	{
		modelId: [0x00, 0x43],
		modelName: 'RD-700',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 4,
	},
	// GT-6 (Guitar Effects Processor)
	{
		modelId: [0x00, 0x46],
		modelName: 'GT-6',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SD-90, SD-80 (Studio Canvas)
	{
		modelId: [0x00, 0x48],
		modelName: 'SD-90',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// UM-880 (USB MIDI Interface/MIDI Patcher)
	{
		modelId: [0x00, 0x49],
		modelName: 'UM-880',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 2,
	},
	// SH-32 (Synthesizer)
	{
		modelId: [0x00, 0x4a],
		modelName: 'SH-32',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VK-8/VK-8M (Combo Organ)
	{
		modelId: [0x00, 0x4d],
		modelName: 'VK-8',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// MMP-2 (Mic Modeling Preamp)
	{
		modelId: [0x00, 0x4e],
		modelName: 'MMP-2',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',	// Not confirmed
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// MC-09 (Phrase Lab)
	{
		modelId: [0x00, 0x4f],
		modelName: 'MC-09',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// V-LINK
	{
		modelId: [0x00, 0x51],
		modelName: 'V-LINK',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// V-Bass (V-Bass System)
	{
		modelId: [0x00, 0x52],
		modelName: 'V-Bass',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// V-Synth Version 2, V-Synth XT
	{
		modelId: [0x00, 0x53],
		modelName: 'V-Synth',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// UM-550 (USB MIDI Interface/MIDI Patcher)
	{
		modelId: [0x00, 0x54],
		modelName: 'UM-550',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 2,
	},
	// SI-24 (Studio Interface)
	{
		modelId: [0x00, 0x57],
		modelName: 'SI-24',
		commands: [],
	},
	// UA-700 (USB Audio Interface)
	{
		modelId: [0x00, 0x58],
		modelName: 'UA-700',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// MC-909 (sampling groovebox)
	{
		modelId: [0x00, 0x59],
		modelName: 'MC-909',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// DL-2040, RDL-2040 (Multi CH Delay Line)
	{
		modelId: [0x00, 0x5e],
		modelName: 'DL-2040',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// VR-760 (Combo Keyboard)
	{
		modelId: [0x00, 0x5f],
		modelName: 'VR-760',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// FP-5 (Digital Piano)
	{
		modelId: [0x00, 0x60],
		modelName: 'FP-5',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	},
	// PCR-30/50/80/A30, PCR-M1, PCR-M30/M50/M80 (MIDI Keyboard Controller)
	{
		modelId: [0x00, 0x62],
		modelName: 'PCR',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 1,
	},
	// GS-10 (Guitar Effects System)
	{
		modelId: [0x00, 0x63],
		modelName: 'GS-10',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// JUNO-D, RS-70/50
	{
		modelId: [0x00, 0x64],
		modelName: 'JUNO-D',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VK-88 (Combo Organ)
	{
		modelId: [0x00, 0x65],
		modelName: 'VK-88',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SPD-S (Sampling Pad)
	{
		modelId: [0x00, 0x67],
		modelName: 'SPD-S',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// UR-80 (USB Recording System)
	{
		modelId: [0x00, 0x68],
		modelName: 'UR-80',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 1,
	},
	// GI-20 (GK-MIDI Interface)
	{
		modelId: [0x00, 0x6a],
		modelName: 'GI-20',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 4,
	},
	// Fantom-S/S88, Fantom-Xa, Fantom-X6/X7/X8, Fantom XR
	{
		modelId: [0x00, 0x6b],
		modelName: 'Fantom-S/X',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// Minus-One (Not a model modelName)
	{
		modelId: [0x00, 0x6c],
		modelName: 'Minus-One',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	},
	// VariOS 303, VariOS 8
	{
		modelId: [0x00, 0x6d],
		modelName: 'VariOS 303/8',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SP-606 (Sampling Workstation)
	{
		modelId: [0x00, 0x6e],
		modelName: 'SP-606',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 4,
	},
	// FP-2 (Digital Piano)
	{
		modelId: [0x00, 0x6f],
		modelName: 'FP-2',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	},
/*
	// V-1 (4 Channel Video Mixer)
	{
		modelId: [0x00, 0x6f],	// Same Model ID, but completely different product...
		modelName: 'V-1',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	},
*/
	// VS-2000CD (Digital Studio Workstation)
	{
		modelId: [0x00, 0x70],
		modelName: 'VS-2000CD',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GR-20 (Guitar Synthesizer)
	{
		modelId: [0x00, 0x72],
		modelName: 'GR-20',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-3 (Percussion Sound Module)
	{
		modelId: [0x00, 0x76],
		modelName: 'TD-3',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-20 (Percussion Sound Module)
	{
		modelId: [0x00, 0x7a],
		modelName: 'TD-20',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	},
	// P-1 (Photo Presenter)
	{
		modelId: [0x00, 0x7b],
		modelName: 'P-1',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	},
	// FR-3, FR-7/5 (V-Accordion)
	{
		modelId: [0x00, 0x7c],
		modelName: 'V-Accordion',
		deviceId: 0x10,	// Not confirmed
		commands: [0x12],
		addrLen: 4,
	},
	// HP-107 (Digital Piano)
	{
		modelId: [0x00, 0x7e],
		modelName: 'HP-107',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	},
	// DR-880 (Dr. Rhythm)
	{
		modelId: [0x00, 0x00, 0x02],
		modelName: 'DR-880',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// RD-700SX (Digital Piano)
	{
		modelId: [0x00, 0x00, 0x03],
		modelName: 'RD-700SX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// RD-300SX (Digital Piano)
	{
		modelId: [0x00, 0x00, 0x04],
		modelName: 'RD-300SX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GT-8 (Guitar Effects Processor)
	{
		modelId: [0x00, 0x00, 0x06],
		modelName: 'GT-8',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GW-7 (Workstation)
	{
		modelId: [0x00, 0x00, 0x07],
		modelName: 'GW-7',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-12 (Percussion Sound Module)
	{
		modelId: [0x00, 0x00, 0x09],
		modelName: 'TD-12',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	},
	// GT-PRO (Guitar Effects Processor)
	{
		modelId: [0x00, 0x00, 0x0b],
		modelName: 'GT-PRO',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VC-2 (V-Card "Vocal Designer for V-Synth/VariOS")
	{
		modelId: [0x00, 0x00, 0x0d],
		modelName: 'VC-2',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// MC-808 (sampling groovebox)
	{
		modelId: [0x00, 0x00, 0x14],
		modelName: 'MC-808',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// JUNO-G (128 Voice Expandable Synthesizer with Audio/MIDI Song Recorder)
	{
		modelId: [0x00, 0x00, 0x15],
		modelName: 'JUNO-G',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SH-201 (Synthesizer)
	{
		modelId: [0x00, 0x00, 0x16],
		modelName: 'SH-201',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-7]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// E-09 (Interactive Arranger)
	{
		modelId: [0x00, 0x00, 0x17],
		modelName: 'E-09',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VP-550 (Vocal & Ensemble Keyboard)
	{
		modelId: [0x00, 0x00, 0x18],
		modelName: 'VP-550',
		commands: [],
	},
	// HandSonic HPD-10 (Hand Percussion Pad)
	{
		modelId: [0x00, 0x00, 0x19],
		modelName: 'HPD-10',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	},
	// FP-4 (Digital Piano)
	{
		modelId: [0x00, 0x00, 0x1b],
		modelName: 'FP-4',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 4,
	},
	// VG-99 (V-Guitar System)
	{
		modelId: [0x00, 0x00, 0x1c],
		modelName: 'VG-99',
		deviceId: 0x00,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VB-99 (V-Bass System)
	{
		modelId: [0x00, 0x00, 0x1d],
		modelName: 'VB-99',
		deviceId: 0x00,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// V-Synth GT
	{
		modelId: [0x00, 0x00, 0x21],
		modelName: 'V-Synth GT',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SonicCell
	// JUNO-STAGE (128 Voice Expandable Synthesizer with Song Player)
	{
		modelId: [0x00, 0x00, 0x25],
		modelName: 'SonicCell',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// Fantom G6/G7/G8
	{
		modelId: [0x00, 0x00, 0x27],
		modelName: 'Fantom-G',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// RD-700GX (Digital Piano)
	{
		modelId: [0x00, 0x00, 0x2b],
		modelName: 'RD-700GX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// RD-300GX (Digital Piano)
	{
		modelId: [0x00, 0x00, 0x2c],
		modelName: 'RD-300GX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GT-10 (Guitar Effects Processor)
	{
		modelId: [0x00, 0x00, 0x2f],
		modelName: 'GT-10',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VS-700R (Fantom VS)
	{
		modelId: [0x00, 0x00, 0x33],
		modelName: 'Fantom VS',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-20X (Percussion Sound Module)
	{
		modelId: [0x00, 0x00, 0x35],
		modelName: 'TD-20X',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	},
	// GW-8 (Workstation)
	// Prelude (Music Keyboard)
	{
		modelId: [0x00, 0x00, 0x36],
		modelName: 'GW-8',
		commands: [],
	},
	// V-Piano/V-Piano GRAND (GP-7)
	{
		modelId: [0x00, 0x00, 0x39],
		modelName: 'V-Piano',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// JUNO-Di (Mobile Synthesizer with Song Player)
	// JUNO-DS (Synthesizer)
	{
		modelId: [0x00, 0x00, 0x3a],
		modelName: 'JUNO-Di',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VP-770 (Vocal & Ensemble Keyboard)
	{
		modelId: [0x00, 0x00, 0x3b],
		modelName: 'VP-770',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// AX-Synth (Shoulder Synthesizer)
	{
		modelId: [0x00, 0x00, 0x3c],
		modelName: 'AX-Synth',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// GAIA SH-01 (Synthesizer))
	{
		modelId: [0x00, 0x00, 0x41],
		modelName: 'SH-01',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VR-700 (V-Combo)
	{
		modelId: [0x00, 0x00, 0x42],
		modelName: 'VR-700',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// SPD-30 Version 2 (OCTAPAD)
	{
		modelId: [0x00, 0x00, 0x48],
		modelName: 'SPD-30',
		commands: [],
	},
	// SD-50 (Mobile Studio Canvas)
	{
		modelId: [0x00, 0x00, 0x4a],
		modelName: 'SD-50',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// JUNO-Gi (Mobile Synthesizer with Digital Recorder)
	{
		modelId: [0x00, 0x00, 0x4c],
		modelName: 'JUNO-Gi',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// RD-700NX (Digital Piano)
	{
		modelId: [0x00, 0x00, 0x50],
		modelName: 'RD-700NX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// RD-300NX (Digital Piano)
	{
		modelId: [0x00, 0x00, 0x51],
		modelName: 'RD-300NX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// BK-3 (Backing Keyboard)
	{
		modelId: [0x00, 0x00, 0x54],
		modelName: 'BK-3',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 4,
	},
	// JUPITER-80 (Synthesizer)
	{
		modelId: [0x00, 0x00, 0x55],
		modelName: 'JUPITER-80',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// BR-80 (Digital Recorder)
	{
		modelId: [0x00, 0x00, 0x59],
		modelName: 'BR-80',
		commands: [],
	},
	// GT-100 (Amp Effects Processor)
	{
		modelId: [0x00, 0x00, 0x60],
		modelName: 'GT-100',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-30 (Drum Sound Module)
	{
		modelId: [0x00, 0x00, 0x61],
		modelName: 'TD-30',
		commands: [],
	},
	// JUPITER-50 (Synthesizer)
	{
		modelId: [0x00, 0x00, 0x63],
		modelName: 'JUPITER-50',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// INTEGRA-7 (SuperNATURAL Sound Module)
	{
		modelId: [0x00, 0x00, 0x64],
		modelName: 'INTEGRA-7',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// V-Combo VR-09/730 (for Mode 1)
	{
		modelId: [0x00, 0x00, 0x71],
		modelName: 'VR-09/730',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 4,
	},
	// RD-800, RD-2000 (Digital Piano)
	{
		modelId: [0x00, 0x00, 0x75],
		modelName: 'RD-800',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// FA-06/07/08 (Music Workstation)
	{
		modelId: [0x00, 0x00, 0x77],
		modelName: 'FA-06/07/08',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// HandSonic HPD-20 (Hand Percussion Pad)
	{
		modelId: [0x00, 0x00, 0x78],
		modelName: 'HPD-20',
		commands: [],
	},
	// GT-001 (Guitar Effects Processor)
	{
		modelId: [0x00, 0x00, 0x00, 0x06],
		modelName: 'GT-001',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// JD-Xi (Analog/Digital Crossover Synthesizer)
	{
		modelId: [0x00, 0x00, 0x00, 0x0e],
		modelName: 'JD-Xi',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',	// Note: The manual said that the device ID cannot be changed from "17 (0x10)".
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// JD-XA (Analog/Digital Crossover Synthesizer)
	{
		modelId: [0x00, 0x00, 0x00, 0x0f],
		modelName: 'JD-XA',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// LX-17, LX-7, HP605, HP603, KF-10, GP607, DP603, HP603A, HP601, RP102
	// FP-90/60
	{
		modelId: [0x00, 0x00, 0x00, 0x19],
		modelName: 'Piano',
		commands: [],
	},
	// TD-50 (Drum Sound Module)
	{
		modelId: [0x00, 0x00, 0x00, 0x24],
		modelName: 'TD-50',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// AE-10 (Aerophone)
	{
		modelId: [0x00, 0x00, 0x00, 0x2f],
		modelName: 'AE-10',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// TD-17/TD-17-L (Drum Sound Module)
	{
		modelId: [0x00, 0x00, 0x00, 0x4b],
		modelName: 'TD-17',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// VT-4 (Voice Transformer)
	{
		modelId: [0x00, 0x00, 0x00, 0x51],
		modelName: 'VT-4',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	},
	// AX-Edge
	{
		modelId: [0x00, 0x00, 0x00, 0x52],
		modelName: 'AX-Edge',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	},
];

function makeParsers(modelProp) {
	console.assert(modelProp);

	const commandNames = {
		0x11: 'Data Request 1 (RQ1)',
		0x12: 'Data Set 1 (DT1)',
		0x40: 'Want to Send Data (WSD)',
		0x41: 'Data Request (RQD)',
		0x42: 'Data Set (RQ1)',
		0x43: 'Acknowledge (ACK)',
		0x45: 'End of Data (EOD)',
		0x4e: 'Communication Error (ERR)',
		0x4f: 'Rejection (RJC)',
	};

	const modelIdStr = bytesToHex([].concat(modelProp.modelId));
	const deviceIdStr = (modelProp.deviceIdRegexp) ? modelProp.deviceIdRegexp : ('deviceId' in modelProp) ? bytesToHex([modelProp.deviceId]) : '..';
	const addrStr = [...new Array(modelProp.addrLen)].fill('..').join(' ');

	const parsers = new Map();
	for (const command of modelProp.commands) {
		const commandStr = bytesToHex([command]);

		let regexp, handler;
		switch (command) {
		case 0x11:	// RQ1
		case 0x40:	// WSD
		case 0x41:	// RQD
			regexp = new RegExp(String.raw`^f0 41 ${deviceIdStr} ${modelIdStr} ${commandStr} ${addrStr} ${addrStr} .. f7$`, 'u');
			handler = ((modelId, modelName, addrLen, commandName) => {
				const modelIdLen = Array.isArray(modelId) ? modelId.length : 1;
				return (bytes) => {
					let index = 0;
					const [mfrId, deviceId] = stripEnclosure(bytes);
					console.assert(mfrId === 0x41);
					index += 3 + modelIdLen;

					const commandId = bytes[index];
					index++;

					const isCheckSumError = checkSumError(bytes.slice(index, -1));

					const address = bytes.slice(index, index + addrLen);
					console.assert(address.length === addrLen);
					index += addrLen;

					const size = bytes.slice(index, index + addrLen);
					console.assert(size.length === addrLen);
					index += addrLen;

					const checkSum = bytes[index];

					return {mfrId, deviceId, modelId, modelName, commandId, commandName, address, size, checkSum, isCheckSumError};
				};
			})(modelProp.modelId, modelProp.modelName, modelProp.addrLen, commandNames[command]);
			break;

		case 0x12:	// DT1
		case 0x42:	// DAT
			regexp = new RegExp(String.raw`^f0 41 ${deviceIdStr} ${modelIdStr} ${commandStr} ${addrStr} (?:.. )+.. f7$`, 'u');
			handler = ((modelId, modelName, addrLen, commandName) => {
				const modelIdLen = Array.isArray(modelId) ? modelId.length : 1;
				return (bytes) => {
					let index = 0;
					const [mfrId, deviceId] = stripEnclosure(bytes);
					console.assert(mfrId === 0x41);
					index += 3 + modelIdLen;

					const commandId = bytes[index];
					index++;

					const isCheckSumError = checkSumError(bytes.slice(index, -1));

					const address = bytes.slice(index, index + addrLen);
					console.assert(address.length === addrLen);
					index += addrLen;

					const payload = bytes.slice(index, -2);
					const checkSum = bytes[bytes.length - 2];

					return {mfrId, deviceId, modelId, modelName, commandId, commandName, address, payload, checkSum, isCheckSumError};
				};
			})(modelProp.modelId, modelProp.modelName, modelProp.addrLen, commandNames[command]);
			break;

		case 0x43:	// ACK
		case 0x45:	// EOD
		case 0x4e:	// ERR
		case 0x4f:	// RJC
			regexp = new RegExp(String.raw`^f0 41 ${deviceIdStr} ${modelIdStr} ${commandStr} f7$`, 'u');
			handler = ((modelName, commandName) => (bytes) => {
				const [mfrId, deviceId, modelId, commandId] = stripEnclosure(bytes);
				console.assert(mfrId === 0x41);

				// Note: The length of the module IDs which can deal with "handshake communication" commands are 1-byte.
				// No one has a multi-byte model ID with any 0x00 as prefix.
				console.assert(modelId !== 0x00);

				return {mfrId, deviceId, modelId, modelName, commandId, commandName};
			})(modelProp.modelName, commandNames[command]);
			break;

		default:
			console.assert(false, 'Unexpected case', {command});
			break;
		}

		const key = `f0 41 ${bytesToHex([modelProp.deviceId || 0x00])} ${modelIdStr} ${commandStr}`;
		parsers.set(key, {regexp, handler});
	}

	return parsers;
}

// Add SysEx parsers.
for (const modelProp of modelProps) {
	const parsers = makeParsers(modelProp);
	addSysExParsers(parsers);
}
