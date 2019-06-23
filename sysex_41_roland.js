import {addSysExParsers, bytesToHex, stripEnclosure, checkSumError} from './sysex_instance.js';

const modelProps = new Map([
	// MT-32, CM-32L, CM-32P, and CM-64 (including D-10/110, D-20, D-5, and GR-50)
	[0x16, {
		name: 'CM-64',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',	// Some modules might not accept 11h-1fh.
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],	// CM-32P (and CM-64 PCM part) only supports DT1.
		addrLen: 3,
	}],
	// SC-55, SC-55mkII, SC-88, SC-88Pro, SC-8820, SC-8850, and so on
	[0x42, {
		name: 'GS',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// LCD for Sound Canvas series
	[0x45, {
		name: 'SC LCD',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// SC-7 (GM Sound Module)
	[0x56, {
		name: 'SC-7',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	}],

	// S-10 (Digital Sampling Keyboard)
	// MKS-100 (Digital Sampler)
	[0x10, {
		name: 'S-10',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	}],
	// GM-70 (Guitar-MIDI Interface)
	[0x11, {
		name: 'GM-70',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// DEP-3 (Digital Effects Processor)
	[0x12, {
		name: 'DEP-3',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// GP-8 (Guitar Effects Processor)
	[0x13, {
		name: 'GP-8',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	}],
	// D-50/D-550, and D-05 (Linear Synthesizer)
	// VC-1 (V-Card "D-50 for V-Synth/VariOS")
	[0x14, {
		name: 'D-50',
		deviceId: 0x00,
		deviceIdRegexp: '(?:0[0-9a-f]|10)',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	}],
	// S-50 (Digital Sampling Keyboard)
	[0x18, {
		name: 'S-50',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	}],
	// PM-16 (Pad MIDI Interface)
	[0x19, {
		name: 'PM-16',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// C-50/20, C-80 (Harpsichord)
	// C-280 (Organ)
	// DP-970, DP-900/700, F-30, F-50, F-90, F-100, FP-1, FP-8, FP-9, RP-80 (Digital Piano)
	// HP-1000S, HP-145, HP-147/R, HP-1700/900, HP-2/3/7, HP-237, HP-330/530/245, HP-2500, HP-2700/3700, HP-2800/3800, HP-2880, HP-3500S/4000S/5000S, HP-600/700/800, HP-103 (Digital Piano)
	// KR-33, KR-55 (Digital Keyboard)
	[0x1a, {
		name: 'Piano',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// R-880 (Digital Reverb)
	[0x1b, {
		name: 'R-880',
		deviceId: 0x00,
		deviceIdRegexp: '(?:0[0-9a-f]|7f)',
		commands: [0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	}],
	// TR-626 (Rhythm Composer)
	[0x1d, {
		name: 'TR-626',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// S-550, S-330 (Digital Sampler)
	[0x1e, {
		name: 'S-550',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 4,
	}],
	// ME-5 (Guitar Multiple Effects)
	[0x1f, {
		name: 'ME-5',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	}],
	// A-880 (MIDI Patcher/Mixer)
	[0x20, {
		name: 'A-880',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 1,
	}],
	// P-330 (Digital Piano)
	[0x22, {
		name: 'P-330',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// U-110 (PCM Sound Module)
	[0x23, {
		name: 'U-110',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// E-660 (Parametric Equalizer)
	[0x24, {
		name: 'E-660',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// PAD-80 (MIDI Pad Controller)
	[0x25, {
		name: 'PAD-80',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',	// Not confirmed
		commands: [0x12],
		addrLen: 3,
	}],
	// GS-6 (Guitar Sound System)
	[0x26, {
		name: 'GS-6',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	}],
	// A-50, A-80 (MIDI Keyboard Controller)
	[0x27, {
		name: 'A-50/80',
		deviceId: 0x00,
		commands: [0x12],
		addrLen: 3,
	}],
	// FC-100mkII (Foot Controller)
	[0x29, {
		name: 'FC-100mkII',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 1,
	}],
	// GP-16 (Guitar Effects Processor)
	[0x2a, {
		name: 'GP-16',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	}],
	// U-220 (RS-PCM Sound Module)
	// U-20 (RS-PCM Keyboard)
	[0x2b, {
		name: 'U-220',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// CA-30 (Intelligent Arranger)
	// RA-50 (Realtime Arranger)
	[0x2d, {
		name: 'CA-30/RA-50',
		deviceId: 0x1f,
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// KR-500 (Digital Keyboard)
	[0x2e, {
		name: 'KR-500',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// Rodgers 445/702 (Organ)
	[0x30, {
		name: 'Rodgers 445/702',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// PRO-E (Intelligent Arranger)
	[0x31, {
		name: 'PRO-E',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// E-5 (Intelligent Synthesizer)
	// KR-100 (Digital Keyboard)
	[0x32, {
		name: 'E-5',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// E-30 (Intelligent Synthesizer)
	[0x33, {
		name: 'E-30',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// S-770, S-760 (Digital Sampler)
	// SP-700 (16-bit Sample Player)
	[0x34, {
		name: 'S-770',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 4,
	}],
	// Rhodes Model 660/760
	[0x35, {
		name: 'Rhodes 660/760',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// R-8M (Total Percussion Sound Module)
	[0x36, {
		name: 'R-8M',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// SE-50 (Stereo Effects Processor)
	[0x37, {
		name: 'SE-50',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// RSP-550 (Stereo Signal Processor)
	[0x38, {
		name: 'RSP-550',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// D-70 (Super LA Synthesizer)
	[0x39, {
		name: 'D-70',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 3,
	}],
	// D2 Quick, MC-307 Quick, MC-505 Quick, JX-305 Quick
	[0x3a, {
		name: 'Quick',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// SPD-8 (Total Percussion Pad)
	[0x3b, {
		name: 'SPD-8',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// JD-800 (Programmable Synthesizer)
	[0x3d, {
		name: 'JD-800',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// JX-1 (Performance Synthesizer)
	[0x3e, {
		name: 'JX-1',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// E-70 (Intelligent Synthesizer)
	[0x3f, {
		name: 'E-70',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// SSC-8004 (Sound Space Controller)
	[0x43, {
		name: 'SSC-8004',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// A-220 (MIDI Separator)
	[0x44, {
		name: 'A-220',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	}],
	// JV-80 (Multi Timbral Synthesizer)
	// JV-880 (Multi Timbral Synthesizer Module)
	// JV-90 (Expandable Synthesizer)
	// JV-1000 (Music Workstation)
	// M-GS64, M-OC1, M-VS1, M-DC1, M-SE1 (Sound Expansion series)
	[0x46, {
		name: 'JV-880',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VK-1000 (Rhodes Organ)
	[0x48, {
		name: 'VK-1000',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// ME-10 (Guitar Multiple Effects)
	[0x49, {
		name: 'ME-10',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// A-30 (Keyboard Controller)
	[0x4c, {
		name: 'A-30',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	}],
	// JV-30 (16 Part Multi Timbral Synthesizer)
	// JV-50/35 (Expandable Synthesizer)
	[0x4d, {
		name: 'JV-30',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// FG-1000/10 (Music Timer)
	[0x4f, {
		name: 'FG-1000',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// DR-660 (Dr. Rhythm)
	[0x52, {
		name: 'DR-660',
		deviceId: 0x09,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// DJ-70 (Sampling Workstation)
	[0x53, {
		name: 'DJ-70',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 4,
	}],
	// GR-1 (Guitar Synthesizer)
	[0x54, {
		name: 'GR-1',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// SC-33 (for single mode)
	[0x55, {
		name: 'SC-33',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// JD-990 (Super JD Synthesizer Module)
	[0x57, {
		name: 'JD-990',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-7 (Percussion Sound Module)
	[0x58, {
		name: 'TD-7',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SRV-330 (Dimensional Space Reverb)
	[0x59, {
		name: 'SRV-330',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// SDE-330 (Dimensional Space Delay)
	[0x5a, {
		name: 'SDE-330',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// R-8MKII (Human Rhythm Composer)
	[0x5e, {
		name: 'R-8MKII',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// JS-30 (Sampling Workstation)
	[0x5f, {
		name: 'JS-30',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12, 0x40, 0x41, 0x42, 0x43, 0x45, 0x4e, 0x4f],
		addrLen: 4,
	}],
	// SPD-11 (Total Percussion Pad)
	[0x60, {
		name: 'SPD-11',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SE-70 (Super Effects Processor)
	[0x61, {
		name: 'SE-70',
		deviceId: 0x00,
		deviceIdRegexp: '(?:0[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// AT-900/900C/800/500/350C/300/100/75/ATUP-E, AT90S/80S, AT-15 (Organ)
	// V-Combo VR-09/730 (for Mode 2)
	[0x62, {
		name: 'ATELIER',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// P-55 (Piano Module)
	[0x63, {
		name: 'P-55',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// MCR-8 (Multi Controller)
	[0x64, {
		name: 'MCR-8',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 1,
	}],
	// DR-5 (Dr. Rhythm)
	[0x65, {
		name: 'DR-5',
		deviceId: 0x09,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// SDX-330 (Dimensional Expander)
	[0x66, {
		name: 'SDX-330',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',	// Note: The MIDI implementation chart said that the range is "00h-1Eh".
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// GR-09 (Guitar Synthesizer)
	[0x67, {
		name: 'GR-09',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// RV-70 (Digital Stereo Reverb)
	[0x69, {
		name: 'RV-70',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// JV-1080, JV-2080, JV-1010 (64 Voice Synthesizer Module)
	// XP-50, XP-80/60 (Music Workstation)
	// XP-30 (64 Voice Expandable Synthesizer)
	[0x6a, {
		name: 'JV-1080',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],	// Some modules only support DT1.
		addrLen: 4,
	}],
	// RD-500 (Digital Piano)
	[0x6b, {
		name: 'RD-500',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// Rodgers 520/530 (Organ)
	[0x6d, {
		name: 'Rodgers 520/530',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// TD-5 (Percussion Sound Module)
	[0x6e, {
		name: 'TD-5',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GI-10 (Guitar-MIDI Interface)
	[0x70, {
		name: 'GI-10',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// GP-100 (Guitar Preamp Processor)
	[0x71, {
		name: 'GP-100',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// FC-200 (Foot Controller)
	[0x72, {
		name: 'FC-200',
		deviceId: 0x00,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 2,
	}],
	// AP-700 (Advanced Equalizing Processor)
	[0x73, {
		name: 'AP-700',
		deviceId: 0x00,
		deviceIdRegexp: '[0-7][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// VG-8 (V-Guitar System)
	[0x74, {
		name: 'VG-8',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// VG8-EX (V-Guitar System)
	[0x74, {	// Same Model ID, but different size of address...
		name: 'VG-8EX',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// MS-1 (Digital Sampler)
	[0x75, {
		name: 'MS-1',
		deviceId: 0x10,
		commands: [],	// Note: According to the manual, bulk dump of MS-1 seems not to have DT1 (0x12).
		addrLen: 0,
	}],
	// AR-2000 (Audio Recorder)
	[0x76, {
		name: 'AR-2000',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 2,
	}],
	// RA-30 (Realtime Arranger)
	[0x77, {
		name: 'RA-30',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// GX-700 (Guitar Sound System)
	[0x79, {
		name: 'GX-700',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SX-700 (Studio Effects Processor)
	[0x7a, {
		name: 'SX-700',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// XP-10 (Multitimbral Synthesizer)
	[0x7b, {
		name: 'XP-10',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// VS-880 (Digital Studio Workstation)
	[0x7c, {
		name: 'VS-880',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// A-90 (Expandable Controller)
	[0x7d, {
		name: 'A-90',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SN-700 (Noise/Hum Eliminator)
	[[0x00, 0x01], {
		name: 'SN-700',
		deviceId: 0x00,
		deviceIdRegexp: '[0-7][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// A-33 (MIDI Keyboard Controller)
	// PK-6, PK-9 (Dynamic MIDI Pedal)
	[[0x00, 0x02], {
		name: 'A-33',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	}],
	// MC-303 (groovebox)
	[[0x00, 0x03], {
		name: 'MC-303',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GT-5 (Guitar Effects Processor)
	[[0x00, 0x04], {
		name: 'GT-5',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// PMA-5 (Personal Music Assistant)
	[[0x00, 0x05], {
		name: 'PMA-5',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// JP-8000 (Synthesizer)
	// JP-8080 (Synthesizer Module)
	[[0x00, 0x06], {
		name: 'JP-8000',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GR-30 (Guitar Synthesizer)
	[[0x00, 0x07], {
		name: 'GR-30',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VK-7 (Organ)
	// PK-7A, PK-25A（MIDI Pedal Keyboard)
	[[0x00, 0x08], {
		name: 'VK-7',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// RD-600 (Digital Piano)
	[[0x00, 0x09], {
		name: 'RD-600',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-10 (Percussion Sound Module)
	[[0x00, 0x0a], {
		name: 'TD-10',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 4,
	}],
	// D2, MC-307, MC-505 (groovebox)
	// JX-305 (groovesynth)
	[[0x00, 0x0b], {
		name: 'groove',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SPD-20 (Total Percussion Pad)
	[[0x00, 0x0d], {
		name: 'SPD-20',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VS-1680 (24-bit Digital Studio Workstation)
	[[0x00, 0x0e], {
		name: 'VS-1680',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// SP-808 (groovesampler)
	[[0x00, 0x0f], {
		name: 'SP-808',
		commands: [],
		addrLen: 0,
	}],
	// XV-3080, XV-88, XV-5080, XV-5050, XV-2020
	// FA-76 (Fantom)
	[[0x00, 0x10], {
		name: 'XV-5080',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SRV-3030/3030D (24bit Digital Reverb)
	[[0x00, 0x12], {
		name: 'SRV-3030',
		deviceId: 0x00,	// Not confirmed
		deviceIdRegexp: '[0-7][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// DR-202 (Dr. Rhythm)
	[[0x00, 0x13], {
		name: 'DR-202',
		deviceId: 0x11,	// From an example SysEx in the users manual
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VS-880EX (Digital Studio Workstation)
	[[0x00, 0x14], {
		name: 'VS-880EX',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// VM-3100/3100Pro (V-Mixing Station)
	[[0x00, 0x15], {
		name: 'VM-3100',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// VK-77 (Combo Organ)
	[[0x00, 0x1a], {
		name: 'VK-77',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GT-3 (Guitar Effects Processor)
	[[0x00, 0x1b], {
		name: 'GT-3',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// DR-770 (Dr. Rhythm)
	[[0x00, 0x1c], {
		name: 'DR-770',
		deviceId: 0x09,
		deviceIdRegexp: '0[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VP-9000 (VariPhrase Processor)
	// VariOS (Open System Module)
	[[0x00, 0x1d], {
		name: 'VP-9000',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VM-7200/7100 and VM-C7200/C7100 (V-Mixing Station)
	[[0x00, 0x1e], {
		name: 'VM-7200',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// TD-8 (Percussion Sound Module)
	[[0x00, 0x20], {
		name: 'TD-8',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VF-1 (24-bit Multiple Effects Processor)
	[[0x00, 0x23], {
		name: 'VF-1',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// VG-88 (V-Guitar System)
	[[0x00, 0x27], {
		name: 'VG-88',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VSR-880 (24-bit Digital Studio Recorder)
	[[0x00, 0x29], {
		name: 'VSR-880',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// VS-1880, VS-1824 (24-bit Digital Studio Workstation)
	[[0x00, 0x2a], {
		name: 'VS-1880',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// SP-808EX (e-MIX STUDIO)
	[[0x00, 0x2b], {
		name: 'SP-808EX',
		commands: [],
		addrLen: 0,
	}],
	// HandSonic HPD-15 (Hand Percussion Pad)
	[[0x00, 0x2e], {
		name: 'HPD-15',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VS-890 (24-bit Digital Studio Workstation)
	[[0x00, 0x2f], {
		name: 'VS-890',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// GR-33 (Guitar Synthesizer)
	[[0x00, 0x30], {
		name: 'GR-33',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SRQ-2031/RDQ-2031 (Digital Graphic Equalizer)
	[[0x00, 0x31], {
		name: 'SRQ-2031',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// SRQ-4015/RDQ-4015 (Digital Graphic Equalizer)
	[[0x00, 0x32], {
		name: 'SRQ-4015',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// EF-303 (Groove Effects)
	[[0x00, 0x33], {
		name: 'EF-303',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VGA-7 (V-Guitar Amplifier)
	[[0x00, 0x34], {
		name: 'VGA-7',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 4,
	}],
	// JS-5 (Jam Station)
	[[0x00, 0x35], {
		name: 'JS-5',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VE-7000 (CH Edit Controller)
	[[0x00, 0x36], {
		name: 'VE-7000',
		deviceId: 0x7f,
		commands: [0x12],
		addrLen: 3,
	}],
	// AR-3000 (Audio Recorder)
	[[0x00, 0x37], {
		name: 'AR-3000',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// AR-200 (Audio Recorder)
	[[0x00, 0x38], {
		name: 'AR-200',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// SP-505 (Groove Sampling Workstation)
	[[0x00, 0x39], {
		name: 'SP-505',
		commands: [],
		addrLen: 0,
	}],
	// FP-3 (Digital Piano)
	[[0x00, 0x3a], {
		name: 'FP-3',
		commands: [],
	}],
	// CDX-1 (Multitrack CD Recorder/Audio Sample Workstation)
	[[0x00, 0x3b], {
		name: 'CDX-1',
		commands: [],
	}],
	// RS-5/9 (64 Voice Synthesizer)
	[[0x00, 0x3c], {
		name: 'RS-9',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-6, TD-6V (Percussion Sound Module)
	[[0x00, 0x3f], {
		name: 'TD-6',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VS-2480/2480CD (24Tr/24-bit/96kHz Digital Studio Workstation)
	[[0x00, 0x40], {
		name: 'VS-2480',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// DR-670 (Dr. Rhythm)
	[[0x00, 0x41], {
		name: 'DR-670',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 5,
	}],
	// RD-700 (Digital Piano)
	[[0x00, 0x43], {
		name: 'RD-700',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 4,
	}],
	// GT-6 (Guitar Effects Processor)
	[[0x00, 0x46], {
		name: 'GT-6',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SD-90, SD-80 (Studio Canvas)
	[[0x00, 0x48], {
		name: 'SD-90',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// UM-880 (USB MIDI Interface/MIDI Patcher)
	[[0x00, 0x49], {
		name: 'UM-880',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 2,
	}],
	// SH-32 (Synthesizer)
	[[0x00, 0x4a], {
		name: 'SH-32',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VK-8/VK-8M (Combo Organ)
	[[0x00, 0x4d], {
		name: 'VK-8',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// MMP-2 (Mic Modeling Preamp)
	[[0x00, 0x4e], {
		name: 'MMP-2',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',	// Not confirmed
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// MC-09 (Phrase Lab)
	[[0x00, 0x4f], {
		name: 'MC-09',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// V-LINK
	[[0x00, 0x51], {
		name: 'V-LINK',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// V-Bass (V-Bass System)
	[[0x00, 0x52], {
		name: 'V-Bass',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// V-Synth Version 2, V-Synth XT
	[[0x00, 0x53], {
		name: 'V-Synth',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// UM-550 (USB MIDI Interface/MIDI Patcher)
	[[0x00, 0x54], {
		name: 'UM-550',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 2,
	}],
	// SI-24 (Studio Interface)
	[[0x00, 0x57], {
		name: 'SI-24',
		commands: [],
	}],
	// UA-700 (USB Audio Interface)
	[[0x00, 0x58], {
		name: 'UA-700',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// MC-909 (sampling groovebox)
	[[0x00, 0x59], {
		name: 'MC-909',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// DL-2040, RDL-2040 (Multi CH Delay Line)
	[[0x00, 0x5e], {
		name: 'DL-2040',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// VR-760 (Combo Keyboard)
	[[0x00, 0x5f], {
		name: 'VR-760',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// FP-5 (Digital Piano)
	[[0x00, 0x60], {
		name: 'FP-5',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	}],
	// PCR-30/50/80/A30, PCR-M1, PCR-M30/M50/M80 (MIDI Keyboard Controller)
	[[0x00, 0x62], {
		name: 'PCR',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 1,
	}],
	// GS-10 (Guitar Effects System)
	[[0x00, 0x63], {
		name: 'GS-10',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// JUNO-D, RS-70/50
	[[0x00, 0x64], {
		name: 'JUNO-D',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VK-88 (Combo Organ)
	[[0x00, 0x65], {
		name: 'VK-88',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SPD-S (Sampling Pad)
	[[0x00, 0x67], {
		name: 'SPD-S',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// UR-80 (USB Recording System)
	[[0x00, 0x68], {
		name: 'UR-80',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 1,
	}],
	// GI-20 (GK-MIDI Interface)
	[[0x00, 0x6a], {
		name: 'GI-20',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 4,
	}],
	// Fantom-S/S88, Fantom-Xa, Fantom-X6/X7/X8, Fantom XR
	[[0x00, 0x6b], {
		name: 'Fantom-S/X',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// Minus-One (Not a model name)
	[[0x00, 0x6c], {
		name: 'Minus-One',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 3,
	}],
	// VariOS 303, VariOS 8
	[[0x00, 0x6d], {
		name: 'VariOS 303/8',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SP-606 (Sampling Workstation)
	[[0x00, 0x6e], {
		name: 'SP-606',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 4,
	}],
	// FP-2 (Digital Piano)
	[[0x00, 0x6f], {
		name: 'FP-2',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	}],
/*
	// V-1 (4 Channel Video Mixer)
	[[0x00, 0x6f], {	// Same Model ID, but completely different product...
		name: 'V-1',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	}],
*/
	// VS-2000CD (Digital Studio Workstation)
	[[0x00, 0x70], {
		name: 'VS-2000CD',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GR-20 (Guitar Synthesizer)
	[[0x00, 0x72], {
		name: 'GR-20',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-3 (Percussion Sound Module)
	[[0x00, 0x76], {
		name: 'TD-3',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-20 (Percussion Sound Module)
	[[0x00, 0x7a], {
		name: 'TD-20',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	}],
	// P-1 (Photo Presenter)
	[[0x00, 0x7b], {
		name: 'P-1',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 3,
	}],
	// FR-3, FR-7/5 (V-Accordion)
	[[0x00, 0x7c], {
		name: 'V-Accordion',
		deviceId: 0x10,	// Not confirmed
		commands: [0x12],
		addrLen: 4,
	}],
	// HP-107 (Digital Piano)
	[[0x00, 0x7e], {
		name: 'HP-107',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 3,
	}],
	// DR-880 (Dr. Rhythm)
	[[0x00, 0x00, 0x02], {
		name: 'DR-880',
		deviceId: 0x10,
		deviceIdRegexp: '1[0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// RD-700SX (Digital Piano)
	[[0x00, 0x00, 0x03], {
		name: 'RD-700SX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// RD-300SX (Digital Piano)
	[[0x00, 0x00, 0x04], {
		name: 'RD-300SX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GT-8 (Guitar Effects Processor)
	[[0x00, 0x00, 0x06], {
		name: 'GT-8',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GW-7 (Workstation)
	[[0x00, 0x00, 0x07], {
		name: 'GW-7',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-12 (Percussion Sound Module)
	[[0x00, 0x00, 0x09], {
		name: 'TD-12',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	}],
	// GT-PRO (Guitar Effects Processor)
	[[0x00, 0x00, 0x0b], {
		name: 'GT-PRO',
		deviceId: 0x00,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VC-2 (V-Card "Vocal Designer for V-Synth/VariOS")
	[[0x00, 0x00, 0x0d], {
		name: 'VC-2',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// MC-808 (sampling groovebox)
	[[0x00, 0x00, 0x14], {
		name: 'MC-808',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// JUNO-G (128 Voice Expandable Synthesizer with Audio/MIDI Song Recorder)
	[[0x00, 0x00, 0x15], {
		name: 'JUNO-G',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SH-201 (Synthesizer)
	[[0x00, 0x00, 0x16], {
		name: 'SH-201',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-7]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// E-09 (Interactive Arranger)
	[[0x00, 0x00, 0x17], {
		name: 'E-09',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VP-550 (Vocal & Ensemble Keyboard)
	[[0x00, 0x00, 0x18], {
		name: 'VP-550',
		commands: [],
	}],
	// HandSonic HPD-10 (Hand Percussion Pad)
	[[0x00, 0x00, 0x19], {
		name: 'HPD-10',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	}],
	// FP-4 (Digital Piano)
	[[0x00, 0x00, 0x1b], {
		name: 'FP-4',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 4,
	}],
	// VG-99 (V-Guitar System)
	[[0x00, 0x00, 0x1c], {
		name: 'VG-99',
		deviceId: 0x00,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VB-99 (V-Bass System)
	[[0x00, 0x00, 0x1d], {
		name: 'VB-99',
		deviceId: 0x00,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// V-Synth GT
	[[0x00, 0x00, 0x21], {
		name: 'V-Synth GT',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SonicCell
	// JUNO-STAGE (128 Voice Expandable Synthesizer with Song Player)
	[[0x00, 0x00, 0x25], {
		name: 'SonicCell',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// Fantom G6/G7/G8
	[[0x00, 0x00, 0x27], {
		name: 'Fantom-G',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// RD-700GX (Digital Piano)
	[[0x00, 0x00, 0x2b], {
		name: 'RD-700GX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// RD-300GX (Digital Piano)
	[[0x00, 0x00, 0x2c], {
		name: 'RD-300GX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GT-10 (Guitar Effects Processor)
	[[0x00, 0x00, 0x2f], {
		name: 'GT-10',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VS-700R (Fantom VS)
	[[0x00, 0x00, 0x33], {
		name: 'Fantom VS',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-20X (Percussion Sound Module)
	[[0x00, 0x00, 0x35], {
		name: 'TD-20X',
		deviceId: 0x10,
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x12],
		addrLen: 4,
	}],
	// GW-8 (Workstation)
	// Prelude (Music Keyboard)
	[[0x00, 0x00, 0x36], {
		name: 'GW-8',
		commands: [],
	}],
	// V-Piano/V-Piano GRAND (GP-7)
	[[0x00, 0x00, 0x39], {
		name: 'V-Piano',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// JUNO-Di (Mobile Synthesizer with Song Player)
	// JUNO-DS (Synthesizer)
	[[0x00, 0x00, 0x3a], {
		name: 'JUNO-Di',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VP-770 (Vocal & Ensemble Keyboard)
	[[0x00, 0x00, 0x3b], {
		name: 'VP-770',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// AX-Synth (Shoulder Synthesizer)
	[[0x00, 0x00, 0x3c], {
		name: 'AX-Synth',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// GAIA SH-01 (Synthesizer))
	[[0x00, 0x00, 0x41], {
		name: 'SH-01',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VR-700 (V-Combo)
	[[0x00, 0x00, 0x42], {
		name: 'VR-700',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// SPD-30 Version 2 (OCTAPAD)
	[[0x00, 0x00, 0x48], {
		name: 'SPD-30',
		commands: [],
	}],
	// SD-50 (Mobile Studio Canvas)
	[[0x00, 0x00, 0x4a], {
		name: 'SD-50',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// JUNO-Gi (Mobile Synthesizer with Digital Recorder)
	[[0x00, 0x00, 0x4c], {
		name: 'JUNO-Gi',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// RD-700NX (Digital Piano)
	[[0x00, 0x00, 0x50], {
		name: 'RD-700NX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// RD-300NX (Digital Piano)
	[[0x00, 0x00, 0x51], {
		name: 'RD-300NX',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// BK-3 (Backing Keyboard)
	[[0x00, 0x00, 0x54], {
		name: 'BK-3',
		deviceId: 0x10,
		deviceIdRegexp: '[01][0-9a-f]',
		commands: [0x12],
		addrLen: 4,
	}],
	// JUPITER-80 (Synthesizer)
	[[0x00, 0x00, 0x55], {
		name: 'JUPITER-80',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// BR-80 (Digital Recorder)
	[[0x00, 0x00, 0x59], {
		name: 'BR-80',
		commands: [],
	}],
	// GT-100 (Amp Effects Processor)
	[[0x00, 0x00, 0x60], {
		name: 'GT-100',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-30 (Drum Sound Module)
	[[0x00, 0x00, 0x61], {
		name: 'TD-30',
		commands: [],
	}],
	// JUPITER-50 (Synthesizer)
	[[0x00, 0x00, 0x63], {
		name: 'JUPITER-50',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// INTEGRA-7 (SuperNATURAL Sound Module)
	[[0x00, 0x00, 0x64], {
		name: 'INTEGRA-7',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// V-Combo VR-09/730 (for Mode 1)
	[[0x00, 0x00, 0x71], {
		name: 'VR-09/730',
		deviceId: 0x10,
		commands: [0x12],
		addrLen: 4,
	}],
	// RD-800, RD-2000 (Digital Piano)
	[[0x00, 0x00, 0x75], {
		name: 'RD-800',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// FA-06/07/08 (Music Workstation)
	[[0x00, 0x00, 0x77], {
		name: 'FA-06/07/08',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// HandSonic HPD-20 (Hand Percussion Pad)
	[[0x00, 0x00, 0x78], {
		name: 'HPD-20',
		commands: [],
	}],
	// GT-001 (Guitar Effects Processor)
	[[0x00, 0x00, 0x00, 0x06], {
		name: 'GT-001',
		deviceId: 0x10,	// Not confirmed
		deviceIdRegexp: '(?:[01][0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// JD-Xi (Analog/Digital Crossover Synthesizer)
	[[0x00, 0x00, 0x00, 0x0e], {
		name: 'JD-Xi',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',	// Note: The manual said that the device ID cannot be changed from "17 (0x10)".
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// JD-XA (Analog/Digital Crossover Synthesizer)
	[[0x00, 0x00, 0x00, 0x0f], {
		name: 'JD-XA',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// LX-17, LX-7, HP605, HP603, KF-10, GP607, DP603, HP603A, HP601, RP102
	// FP-90/60
	[[0x00, 0x00, 0x00, 0x19], {
		name: 'Piano',
		commands: [],
	}],
	// TD-50 (Drum Sound Module)
	[[0x00, 0x00, 0x00, 0x24], {
		name: 'TD-50',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// AE-10 (Aerophone)
	[[0x00, 0x00, 0x00, 0x2f], {
		name: 'AE-10',
		deviceId: 0x10,
		deviceIdRegexp: '(?:10|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// TD-17/TD-17-L (Drum Sound Module)
	[[0x00, 0x00, 0x00, 0x4b], {
		name: 'TD-17',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// VT-4 (Voice Transformer)
	[[0x00, 0x00, 0x00, 0x51], {
		name: 'VT-4',
		deviceId: 0x10,
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
	// AX-Edge
	[[0x00, 0x00, 0x00, 0x52], {
		name: 'AX-Edge',
		deviceId: 0x10,
		deviceIdRegexp: '(?:1[0-9a-f]|7f)',
		commands: [0x11, 0x12],
		addrLen: 4,
	}],
]);

function makeParsers(modelId, modelProps) {
	console.assert(modelProps);

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

	const modelIdStr = bytesToHex([].concat(modelId));
	const deviceIdStr = (modelProps.deviceIdRegexp) ? modelProps.deviceIdRegexp : ('deviceId' in modelProps) ? bytesToHex([modelProps.deviceId]) : '..';
	const addrStr = [...new Array(modelProps.addrLen)].fill('..').join(' ');

	const parsers = new Map();
	for (const command of modelProps.commands) {
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
					index += 3;

					index += modelIdLen;
					const isCheckSumError = checkSumError(bytes.slice(index, -1));

					const commandId = bytes[index];
					index++;

					const address = bytes.slice(index, index + addrLen);
					console.assert(address.length === addrLen);
					index += addrLen;

					const size = bytes.slice(index, index + addrLen);
					console.assert(size.length === addrLen);
					index += addrLen;

					const checkSum = bytes[index];

					return {mfrId, deviceId, modelId, modelName, commandId, commandName, address, size, checkSum, isCheckSumError};
				};
			})(modelId, modelProps.name, modelProps.addrLen, commandNames[command]);
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
					index += 3;

					index += modelIdLen;
					const isCheckSumError = checkSumError(bytes.slice(index, -1));

					const commandId = bytes[index];
					index++;

					const address = bytes.slice(index, index + addrLen);
					console.assert(address.length === addrLen);
					index += addrLen;

					const payload = bytes.slice(index, -2);
					const checkSum = bytes[bytes.length - 2];

					return {mfrId, deviceId, modelId, modelName, commandId, commandName, address, payload, checkSum, isCheckSumError};
				};
			})(modelId, modelProps.name, modelProps.addrLen, commandNames[command]);
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
			})(modelProps.name, commandNames[command]);
			break;

		default:
			console.assert(false, 'Unexpected case', {command});
			break;
		}

		const key = `f0 41 ${bytesToHex([modelProps.deviceId || 0x00])} ${modelIdStr} ${commandStr}`;
		parsers.set(key, {regexp, handler});
	}

	return parsers;
}

// Add SysEx parsers.
for (const model of modelProps) {
	const parsers = makeParsers(...model);
	addSysExParsers(parsers);
}
