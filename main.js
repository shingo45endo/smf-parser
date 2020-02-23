import fs from 'fs';
import util from 'util';
import assert from 'assert';

import {parseSmfToSeq} from './smf_parser.js';
import {parseSyxToSeq} from './syx_parser.js';
import {analyzeMidiMessage} from './midi_event.js';
import {analyzeMetaEvent} from './meta_event.js';
import {MidiModule} from './module.js';

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
		for (const seqTrack of seq.tracks) {
			const module = new MidiModule();
			const track = [...seqTrack.entries()].reduce((p, c) => {
				const [timestamp, events] = c;
				for (const bytes of events) {
					const messages = [];
					if (bytes[0] !== 0xff) {
						const mes = analyzeMidiMessage(bytes);
						const mes2 = module.ports[0].inputBytes(bytes);
						if (mes2.length === 1) {
							console.assert(mes.kind === mes2[0].kind);
							messages.push(mes);
						} else {
							messages.push(...mes2);
						}
					} else {
						messages.push(analyzeMetaEvent(bytes));
					}

					for (const message of messages) {
						const obj = {timestamp};
						for (const key of Object.keys(message)) {
							if (key === 'results' || key === 'partNo') {
								continue;
							}
							const value = message[key];
							obj[key] = (value instanceof Uint8Array) ? [...value] : value;
						}
						p.push(obj);
					}
				}
				return p;
			}, []);
			json.tracks.push(track);
		}

		await writeFileAsync(`${process.argv[2]}.json`, JSON.stringify(json, null, 4));

	} catch (e) {
		console.error(e);
	}
})();
