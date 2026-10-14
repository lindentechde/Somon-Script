#!/usr/bin/env node
/**
 * Builds the learn kit, dist/learn: what a website needs to show the lessons
 * of the tutorial card by card, and a playground, with SomonScript's own
 * compiler. The npm package ships it, as @lindentech/somon-script/dist/learn/…:
 *
 *   worker.js       the compiler and its run time for a classic Web Worker
 *                   (src/playground/worker.ts), minified
 *   lessons.json    the lessons as steps (scripts/learn-lessons.js)
 *   tasks.json      the tasks with their statements and tests
 *   examples.json   the playground's examples
 *   words.json      the words to highlight and their kinds
 *   manifest.json   the package version, the schema of the JSON files, the
 *                   protocol of the worker's events, and the worker's size and hash
 *   client.js, animations.js (and .d.ts), compiled by `tsc` from src/learn:
 *                   running programs in the worker, checking tasks, the animations
 *
 * The build fails when a step names an unknown animation or one that needs an
 * example, or when the worker or the lessons grow past their budgets.
 *
 * Usage: node scripts/build-learn.js   (after `npm run build`)
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { buildBrowserBundle } = require('./build-browser.js');
const { words, examples, tasks } = require('./learn-data.js');
const { lessons } = require('./learn-lessons.js');

const ROOT = path.join(__dirname, '..');
/** Version of the JSON files' shapes; a page checks it before it reads them. */
const SCHEMA = 1;
/** The worker is downloaded on a learner's first run, often over a slow connection. */
const MAX_WORKER_GZIP = 220 * 1024;
const MAX_LESSONS = 300 * 1024;

/** The worker, minified: names stay (errors and classes are named by them), comments go but the header. */
async function workerCode(distDir) {
  const { code } = buildBrowserBundle({ distDir, entry: 'playground/worker.js' });
  const { minify } = require('terser');
  const minified = await minify(code, {
    ecma: 2020,
    compress: { passes: 2 },
    mangle: true,
    keep_classnames: true,
    keep_fnames: true,
    format: { comments: /^!/ },
  });
  return minified.code;
}

/** Checks the animations of the steps (src/learn/animations.ts). */
function checkAnimations(lessonList, distDir) {
  const { ANIMATIONS, animationProblem } = require(path.join(distDir, 'learn', 'animations.js'));
  for (const lesson of lessonList) {
    for (const step of lesson.steps) {
      if (!step.anim) continue;
      const where = `docs/tutorial/*/${lesson.id}.md, step ${step.id}`;
      const problem = animationProblem(step.anim.name, step.anim.params);
      if (problem) throw new Error(`${where}: ${problem}`);
      if (ANIMATIONS[step.anim.name].trace && step.kind !== 'example') {
        throw new Error(
          `${where}: '${step.anim.name}' draws an example's steps; put it after a ▶ link`
        );
      }
    }
  }
}

async function buildLearn(options = {}) {
  const distDir = options.distDir || path.join(ROOT, 'dist');
  const outDir = options.outDir || path.join(distDir, 'learn');
  if (!fs.existsSync(path.join(distDir, 'learn', 'client.js'))) {
    throw new Error(
      `${path.join(distDir, 'learn', 'client.js')} not found: run 'npm run build' first`
    );
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const { PROTOCOL } = require(path.join(distDir, 'playground', 'run.js'));
  const client = require(path.join(distDir, 'learn', 'client.js'));
  if (client.PROTOCOL !== PROTOCOL) {
    throw new Error(
      `src/learn/client.ts reads protocol ${client.PROTOCOL}, the worker sends ${PROTOCOL}`
    );
  }

  const lessonList = lessons();
  checkAnimations(lessonList, distDir);
  const worker = await workerCode(distDir);
  const files = {
    'lessons.json': JSON.stringify(lessonList),
    'tasks.json': JSON.stringify(tasks()),
    'examples.json': JSON.stringify(examples()),
    'words.json': JSON.stringify(words(distDir)),
  };
  const workerGzip = zlib.gzipSync(worker, { level: 9 }).length;
  if (workerGzip > MAX_WORKER_GZIP) {
    throw new Error(
      `worker.js is ${Math.round(workerGzip / 1024)} KB gzipped, more than ${MAX_WORKER_GZIP / 1024} KB`
    );
  }
  if (files['lessons.json'].length > MAX_LESSONS) {
    throw new Error(
      `lessons.json is ${Math.round(files['lessons.json'].length / 1024)} KB, more than ${MAX_LESSONS / 1024} KB`
    );
  }
  const manifest = {
    version: pkg.version,
    schema: SCHEMA,
    protocol: PROTOCOL,
    worker: {
      file: 'worker.js',
      bytes: Buffer.byteLength(worker),
      gzip: workerGzip,
      sha256: crypto.createHash('sha256').update(worker).digest('hex'),
    },
    lessons: lessonList.length,
    tasks: JSON.parse(files['tasks.json']).length,
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'worker.js'), worker);
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(outDir, name), text);
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { outDir, manifest };
}

if (require.main === module) {
  buildLearn()
    .then(({ outDir, manifest }) => {
      console.log(
        `✅ ${path.relative(process.cwd(), outDir)}: ${manifest.lessons} lessons, ${manifest.tasks} tasks, worker ${Math.round(manifest.worker.bytes / 1024)} KB (${Math.round(manifest.worker.gzip / 1024)} KB gzipped)`
      );
    })
    .catch(error => {
      console.error(`❌ ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = { buildLearn, SCHEMA, MAX_WORKER_GZIP, MAX_LESSONS };
