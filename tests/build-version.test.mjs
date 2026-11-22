import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { bumpVersion, parseVersion } = require('../build.js');

test('parseVersion reads a three-part version', () => {
    assert.deepEqual(parseVersion('1.2.3'), [1, 2, 3]);
    assert.deepEqual(parseVersion(' 10.0.9 '), [10, 0, 9]);
});

test('parseVersion rejects malformed versions', () => {
    for (const bad of ['1.2', '1.2.3.4', 'v1.2.3', '1.2.x', '', 'latest']) {
        assert.throws(() => parseVersion(bad), /Invalid version/);
    }
});

test('bumpVersion increments the patch', () => {
    assert.equal(bumpVersion('1.1.0'), '1.1.1');
    assert.equal(bumpVersion('0.0.0'), '0.0.1');
});

test('bumpVersion rolls the patch into the minor at 9', () => {
    assert.equal(bumpVersion('1.1.9'), '1.2.0');
});

test('bumpVersion rolls the minor into the major at 9', () => {
    assert.equal(bumpVersion('1.9.9'), '2.0.0');
});
