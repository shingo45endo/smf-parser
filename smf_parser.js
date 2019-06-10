export function parseSmfToSeq(buf) {
	// Checks the arguments.
	if (!buf || !buf.length) {
		throw new Error(`Invalid argument: ${buf}`);
	}

	const seq = {
		tracks: [],
	};

	const view = new DataView(buf.buffer, buf.byteOffset);
	let index = 0;

	// Parses the header chunk. (MThd)
	if (!String.fromCharCode(...buf.slice(index, index + 4)).startsWith('MThd')) {
		// Skips MacBinary. (dirty hack)
		index += 128;
		if (!String.fromCharCode(...buf.slice(index, index + 4)).startsWith('MThd')) {
			return null;
		}
	}
	index += 4;

	// length
	const lenHeader = view.getUint32(index);
	if (lenHeader !== 6) {
		return null;
	}
	index += 4;

	// format
	seq.format = view.getUint16(index);
	if (seq.format !== 0 && seq.format !== 1) {
		return null;
	}
	index += 2;

	// ntrks
	const ntrks = view.getUint16(index);
	index += 2;

	// division
	seq.division = view.getUint16(index);
	if ((seq.division & 0x8000) !== 0) {
		return null;
	}
	index += 2;

	// Parses each track chunk. (MTrk)
	for (let i = 0; i < ntrks; i++) {
		if (!String.fromCharCode(...buf.slice(index, index + 4)).startsWith('MTrk')) {
			return null;
		}
		index += 4;

		const track = new Map();

		// length
		const lenTrack = view.getUint32(index);
		index += 4;

		// Parses each MIDI event.
		const baseIndex = index;
		let timestamp = 0;
		let lastStatus = 0;
		while (index < baseIndex + lenTrack) {
			// Delta time
			const [dt, skip] = varNum(buf, index);
			index += skip;
			timestamp += dt;

			if (!track.has(timestamp)) {
				track.set(timestamp, []);
			}

			// Status byte
			let status = buf[index];
			index++;
			if ((status & 0x80) === 0) {
				// Running status
				status = lastStatus;
				lastStatus = 0;
				index--;
			}
			if ((status & 0x80) === 0) {
				throw new Error(`Invalid status byte (${status})`);
			}

			// Adds a MIDI event.
			if (0x80 <= status && status < 0xf0) {
				// MIDI event
				const sm = [status];
				sm.push(buf[index]);
				index++;
				if (status < 0xc0 || status >= 0xe0) {
					sm.push(buf[index]);
					index++;
				}

				track.get(timestamp).push(new Uint8Array(sm));
				lastStatus = status;

			} else if (status === 0xf0) {
				// SysEx event
				const [len, skip] = varNum(buf, index);
				index += skip;
				const lm = [status, ...buf.slice(index, index + len)];
				index += len;

				track.get(timestamp).push(new Uint8Array(lm));

			} else if (status === 0xf7) {
				// SysEx event (raw)
				const [len, skip] = varNum(buf, index);
				index += skip;
				const lm = buf.slice(index, index + len);
				index += len;

				track.get(timestamp).push(lm);

			} else if (status === 0xff) {
				// Meta event
				const [len, skip] = varNum(buf, index + 1);
				const lm = buf.slice(index - 1, index + 1 + skip + len);
				index += 1 + skip + len;

				track.get(timestamp).push(lm);

			} else {
				throw new Error(`Invalid status byte (${status})`);
			}
		}

		seq.tracks.push(track);
	}

	return seq;

	function varNum(bytes, index) {
		let value = 0;
		let len = 0;
		let byte = 0;

		do {
			byte = bytes[index + len];
			value = (value << 7) | (byte & 0x7f);
			len++;
		} while ((byte & 0x80) !== 0);

		return [value, len];
	}
}
