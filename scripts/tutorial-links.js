#!/usr/bin/env node
/**
 * Fills in the playground links of the tutorial (docs/tutorial): a line
 *
 *     [▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=…)
 *
 * opens the code block above it in the playground, with the input of the
 * block between them that follows a line `Вуруд:` (`Ввод:`), if there is one.
 * The code is in the link (#c=, UTF-8 in base64url, as playground/src/app.js
 * reads it), so a link changes with its code: run this after editing a
 * lesson. A link on the page of a task (docs/tutorial/tasks/<id>/README.md)
 * also carries the task's tests (&t=), for the playground's «Санҷидан», and
 * its id (&task=), whose statement the playground shows.
 * `--check` changes nothing and fails when a link is out of date.
 *
 * Usage: node scripts/tutorial-links.js [--check]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { readTests } = require('./check-task.js');

const ROOT = path.join(__dirname, '..');
const TUTORIAL = path.join(ROOT, 'docs', 'tutorial');
const PLAYGROUND = 'https://lindentechde.github.io/Somon-Script/';
const LINK = /^(\[▶[^\]]*\]\()https:\/\/lindentechde\.github\.io\/Somon-Script\/#[^)]*(\))\s*$/;
const INPUT_LABEL = /^(Вуруд|Ввод|Input):\s*$/;

function encode(text) {
  return Buffer.from(text, 'utf8').toString('base64url');
}

/** The playground link of a program, its input, and the tests and id of a task. */
function playgroundLink(code, input, task) {
  const taskPart = task ? `&t=${encode(JSON.stringify(task.tests))}&task=${task.id}` : '';
  return `${PLAYGROUND}#c=${encode(code)}${input ? `&i=${encode(input)}` : ''}${taskPart}`;
}

/** The task whose page `file` is: its id and its tests as the playground reads them, [{ i, o }]. */
function taskOf(file) {
  const testsDir = path.join(path.dirname(file), 'tests');
  if (path.basename(file) !== 'README.md' || !fs.existsSync(testsDir)) return undefined;
  const tests = readTests(path.dirname(file)).map(test => ({ i: test.input, o: test.expected }));
  return { id: path.basename(path.dirname(file)), tests };
}

/** Fenced code blocks of a page: { start, end, text, label } (the line before them). */
function codeBlocks(lines) {
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^(`{3,})\S*\s*$/.exec(lines[i]);
    if (!open) continue;
    let j = i + 1;
    while (j < lines.length && lines[j] !== open[1]) j++;
    const label =
      lines
        .slice(0, i)
        .reverse()
        .find(line => line.trim() !== '') ?? '';
    blocks.push({ start: i, end: j, text: `${lines.slice(i + 1, j).join('\n')}\n`, label });
    i = j;
  }
  return blocks;
}

/** The page with its links made from the code above them. */
function updateLinks(source, file, task) {
  const lines = source.split('\n');
  const blocks = codeBlocks(lines);
  return lines
    .map((line, index) => {
      const link = LINK.exec(line);
      if (!link) return line;
      const before = blocks.filter(block => block.end < index);
      let program = before.pop();
      let input = '';
      if (program && INPUT_LABEL.test(program.label)) {
        input = program.text;
        program = before.pop();
      }
      if (!program)
        throw new Error(`${file}:${index + 1}: a playground link without code above it`);
      return `${link[1]}${playgroundLink(program.text, input, task)}${link[2]}`;
    })
    .join('\n');
}

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

/** Pages whose links are out of date; with `write`, updates them. */
function processTutorial({ write }) {
  const stale = [];
  for (const file of markdownFiles(TUTORIAL).sort()) {
    const source = fs.readFileSync(file, 'utf8');
    const updated = updateLinks(source, path.relative(ROOT, file), taskOf(file));
    if (updated === source) continue;
    stale.push(path.relative(ROOT, file));
    if (write) fs.writeFileSync(file, updated);
  }
  return stale;
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  try {
    const stale = processTutorial({ write: !check });
    if (check && stale.length > 0) {
      console.error(
        `❌ Out-of-date playground links (run: npm run tutorial:links):\n${stale.join('\n')}`
      );
      process.exitCode = 1;
    } else {
      console.log(
        check ? '✅ Playground links are up to date' : `✅ ${stale.length} page(s) updated`
      );
    }
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { playgroundLink, processTutorial, updateLinks };
