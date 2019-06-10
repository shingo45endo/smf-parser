import fs from 'fs';
import util from 'util';
import assert from 'assert';

import {parseSmfToSeq} from './smf_parser.js';

console.assert = assert;

const readFileAsync  = util.promisify(fs.readFile);

(async () => {
	try {
		const smfData = await readFileAsync(process.argv[2]);
		const seq = parseSmfToSeq(new Uint8Array(smfData));
		console.log(seq);
	} catch (e) {
		console.error(e);
	}
})();
