// Generates additional data that can be used to loop the samples correctly.
// Note that MIDI.js does not currently support looped samples.
// Steps to run:
// 1. Download the original Soundfonts - download URLs in README.md
// 2. If file extension is .sfpack, unpack using SFpack
// 3. Export .sf2 file to sfz (all options enabled) using Polyphone Soundfont Editor
// 4. Place the output under ./sfz/, make sure that the folder name is the same as the folder name in ./
// 5. Run this script using 'npm run generate:loop-data'

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';

const soundfonts = (await readdir('./sfz/', { withFileTypes: true })).map(s => s.name);

soundfonts.forEach(async soundfont => {
    const instrumentGroups = (await readdir(`./sfz/${soundfont}`, { withFileTypes: true }))
        .filter(i => /^[0-9].*$/g.test(i.name))
        .map(i => i.name);

    instrumentGroups.forEach(async instrumentGroup => {
        const instruments = (await readdir(`./sfz/${soundfont}/${instrumentGroup}`, { withFileTypes: true }))
            .filter(i => i.isFile() && i.name.endsWith('.sfz'))
            .map(i => i.name);

        instruments.forEach(async instrumentFileName => {
            const instrumentInfo = await readFile(`./sfz/${soundfont}/${instrumentGroup}/${instrumentFileName}`, 'ascii');
            const instrumentName = instrumentFileName.slice(0, -4);

            const regions = instrumentInfo.split('\n\n')
                .filter(i => i.startsWith('<region>'))
                .map(region => {
                    const regionOptions = region
                        .slice(9)
                        .split(/[ \n]/g)
                        .map(pair => pair.split('='))
                        .filter(pair => pair.length === 2)
                        .reduce((acc, pair) => ({...acc, [pair[0]]: pair[1] }), {});

                    if(!regionOptions.lokey || !regionOptions.hikey || !regionOptions.loop_start || !regionOptions.loop_end) {
                        return undefined;
                    }

                    return keyRangeToKeyNames(
                        parseInt(regionOptions.lokey, 10),
                        parseInt(regionOptions.hikey, 10)
                    )
                        .reduce((acc, key) => ({...acc, [key]: [
                            parseInt(regionOptions.loop_start, 10),
                            parseInt(regionOptions.loop_end, 10),
                        ] }), {});
                })
                .filter(Boolean)
                .reduce((acc, regions) => ({...acc,...regions }), {});

            await writeFile(`./${soundfont}/${instrumentName.toLowerCase().replace(/ /g, '_')}-loop.json`, JSON.stringify(regions), 'utf-8');
        });
    });
});

function keyRangeToKeyNames(low, high) {
    return [...Array(high - low + 2).keys()]
        .map(i => {
            const key = i + low;

            if(i < 21) {
                return undefined;
            }

            const note = (['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'])[key % 12];
            const octave = Math.floor((key - 12) / 12);
            
            return `${note}${octave}`;
        })
        .filter(Boolean);
}
