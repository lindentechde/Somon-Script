/**
 * Input for `хондан()` and `хонданиРақам()` in Node.js: read synchronously
 * from the program's standard input, a terminal or a redirected file or pipe
 * (`somon run барнома.som < вуруд.txt`), on Linux, macOS and Windows.
 *
 * - `fs.readSync(0, …)` blocks until a line is typed (or the file has data).
 *   When standard input is non-blocking (a terminal or pipe another program
 *   left so), it fails with `EAGAIN` instead: then wait a little and read again.
 * - Windows reports the end of a pipe as an `EOF` error instead of reading 0
 *   bytes; a console reads what was typed up to Enter, and Ctrl+Z then Enter
 *   ends the input.
 * - Prompts are written synchronously (`fs.writeSync`), so that they appear
 *   before the program waits, also where terminal writes are asynchronous.
 */
import * as fs from 'node:fs';
import * as tty from 'node:tty';

import type { InputHost } from './input';

/** The parts of `fs` the host uses. */
export interface InputFileSystem {
  readSync(
    _fd: number,
    _buffer: Uint8Array,
    _offset: number,
    _length: number,
    _position: null
  ): number;
  writeSync(_fd: number, _text: string): number;
}

/** Waits `ms` milliseconds without returning to the event loop. */
function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function nodeInputHost(
  files: InputFileSystem = fs,
  interactive: boolean = tty.isatty(0)
): InputHost {
  const chunk = new Uint8Array(64 * 1024);
  const decoder = new TextDecoder('utf-8');
  let ended = false;

  const readBytes = (): number => {
    for (;;) {
      try {
        return files.readSync(0, chunk, 0, chunk.length, null);
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'EAGAIN') {
          pause(20);
          continue;
        }
        if (code === 'EOF') return 0;
        throw error;
      }
    }
  };

  return {
    read(): string | null {
      if (ended) return null;
      const count = readBytes();
      if (count > 0) return decoder.decode(chunk.subarray(0, count), { stream: true });
      ended = true;
      // A character cut off at the end of the input
      const rest = decoder.decode();
      return rest === '' ? null : rest;
    },
    write(text: string): void {
      files.writeSync(1, text);
    },
    interactive,
  };
}
