import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildNodeOptions, parseArgs, resolvePnpmCommand } from './build-high-memory.mjs';

describe('parseArgs', () => {
  it('uses an 8192 MB heap by default and forwards extra build args', () => {
    assert.deepEqual(parseArgs(['--filter', '@pokecheetos/client']), {
      heapMb: 8192,
      forwardedArgs: ['--filter', '@pokecheetos/client'],
      showHelp: false
    });
  });

  it('accepts a custom heap flag without forwarding it to pnpm build', () => {
    assert.deepEqual(parseArgs(['--heap=12288', '--filter', '@pokecheetos/server']), {
      heapMb: 12288,
      forwardedArgs: ['--filter', '@pokecheetos/server'],
      showHelp: false
    });
  });
});

describe('buildNodeOptions', () => {
  it('adds the requested heap size while preserving other node options', () => {
    assert.equal(buildNodeOptions('--trace-warnings', 8192), '--trace-warnings --max-old-space-size=8192');
  });

  it('replaces an existing heap size instead of stacking duplicate flags', () => {
    assert.equal(
      buildNodeOptions('--trace-warnings --max-old-space-size=4096', 12288),
      '--trace-warnings --max-old-space-size=12288'
    );
  });
});

describe('resolvePnpmCommand', () => {
  it('uses pnpm.cmd on Windows', () => {
    assert.equal(resolvePnpmCommand('win32'), 'pnpm.cmd');
  });

  it('uses pnpm elsewhere', () => {
    assert.equal(resolvePnpmCommand('linux'), 'pnpm');
  });
});
