import fs from 'fs';
import util from 'util';
import assert from 'assert';

import {parseSmfToSeq} from './smf_parser.js';
import {parseSyxToSeq} from './syx_parser.js';
import {analyzeMidiMessage} from './midi_event.js';
import {analyzeMetaEvent} from './meta_event.js';

console.assert = assert;

const readFileAsync  = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

(async () => {
	try {
		const smfData = await readFileAsync(process.argv[2]);
		let seq = parseSmfToSeq(new Uint8Array(smfData));
		if (!seq) {
			seq = parseSyxToSeq(new Uint8Array(smfData));
		}
		if (!seq) {
			throw new Error('Not SMF or syx file');
		}

		// Converts the sequence data into a JSON.
		const json = {...seq};
		json.tracks = [];
		for (const track of seq.tracks) {
			json.tracks.push(...[...track.entries()].reduce((p, c) => {
				const [timestamp, events] = c;
				for (const bytes of events) {
					const mes = (bytes[0] !== 0xff) ? analyzeMidiMessage(bytes) : analyzeMetaEvent(bytes);
					if (!mes) {
						throw new Error(`Invalid event: ${bytes}`);
					}
					const obj = {timestamp};
					for (const key of Object.keys(mes)) {
						const value = mes[key];
						obj[key] = (value instanceof Uint8Array) ? [...value] : value;
					}
					p.push(obj);
				}
				return p;
			}, []));
		}

		await writeFileAsync(`${process.argv[2]}.json`, JSON.stringify(json, null, 4));

	} catch (e) {
		console.error(e);
	}
})();
