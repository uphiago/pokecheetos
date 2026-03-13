import { spawn } from 'node:child_process';
import process from 'node:process';

const DEFAULT_HEAP_MB = 8192;
const HELP_TEXT = `Usage: pnpm build:high-memory -- [--heap=MB] [...pnpm build args]

Examples:
  pnpm build:high-memory
  pnpm build:high-memory -- --filter @pokecheetos/client
  pnpm build:high-memory -- --heap=12288 --filter @pokecheetos/server`;

export function parseArgs(argv) {
  let heapMb = DEFAULT_HEAP_MB;
  const forwardedArgs = [];
  let showHelp = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      showHelp = true;
      continue;
    }

    if (arg === '--heap') {
      const nextValue = argv[index + 1];

      if (!nextValue) {
        throw new Error('Missing value for --heap');
      }

      heapMb = parseHeapMb(nextValue);
      index += 1;
      continue;
    }

    if (arg.startsWith('--heap=')) {
      heapMb = parseHeapMb(arg.slice('--heap='.length));
      continue;
    }

    forwardedArgs.push(arg);
  }

  return { heapMb, forwardedArgs, showHelp };
}

export function buildNodeOptions(existingNodeOptions, heapMb) {
  const options = `${existingNodeOptions ?? ''}`.replace(/(^|\s)--max-old-space-size=\S+/g, ' ').trim();
  return [options, `--max-old-space-size=${heapMb}`].filter(Boolean).join(' ');
}

export function resolvePnpmCommand(platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

export async function run(argv = process.argv.slice(2), options = {}) {
  const { heapMb, forwardedArgs, showHelp } = parseArgs(argv);

  if (showHelp) {
    console.log(HELP_TEXT);
    return 0;
  }

  const platform = options.platform ?? process.platform;
  const command = resolvePnpmCommand(platform);
  const env = {
    ...process.env,
    ...options.env,
    NODE_OPTIONS: buildNodeOptions(options.env?.NODE_OPTIONS ?? process.env.NODE_OPTIONS, heapMb)
  };
  const spawnImpl = options.spawnImpl ?? spawn;

  return await new Promise((resolve, reject) => {
    const child = spawnImpl(command, ['build', ...forwardedArgs], {
      env,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`pnpm build terminated by signal ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

function parseHeapMb(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid heap size: ${value}`);
  }

  return parsed;
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  run().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error) => {
      console.error(`[build:high-memory] ${error.message}`);
      process.exitCode = 1;
    }
  );
}
