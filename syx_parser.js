export function parseSyxToSeq(buf) {
	// Checks the arguments.
	if (!buf || !buf.length) {
		throw new Error(`Invalid argument: ${buf}`);
	}

	// Checks whether it is a syx file.
	if (buf[0] !== 0xf0) {
		return null;
	}

	// Finds "f0, ..., f7".
	const strs = String.fromCharCode(...buf).match(/\xf0[\s\S]+?\xf7/ug);
	if (!strs) {
		return null;
	}
	const sysExs = strs.map((e) => e.split('').map((ch) => ch.charCodeAt(0)));

	const seq = {
		format: 0,
		division: 480,
		tracks: [new Map()],
	};
	const track = seq.tracks[0];

	let timestamp = 0;
	for (const sysEx of sysExs) {
		track.set(timestamp, [new Uint8Array(sysEx)]);
		timestamp += 10;
	}

	return seq;
}
