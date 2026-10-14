/**
 * The lessons of the tutorial (docs/tutorial/tj and ru) as steps, for a page
 * that shows a lesson card by card (scripts/build-learn.js writes them to
 * dist/learn/lessons.json).
 *
 * The Markdown of a lesson gives its steps:
 *
 *   - the text before its first `##` is the intro;
 *   - each `##` section is a step; a section with ▶ links has one `example`
 *     step for each link, with the link's code and input, the text before its
 *     code and the text after it (`after`);
 *   - `## Хатоҳои маъмул` (`## Частые ошибки`) is a step with `role: 'pitfalls'`;
 *   - the tasks of `## Супоришҳо` (`## Задачи`) are `task` steps;
 *   - what follows `---` (the links to the other lessons) is left out.
 *
 * Comments, which GitHub does not show, add to that:
 *
 *   <!-- step -->                         a new step of the same section begins here
 *   <!-- anim: variable-box {"focus": ["х"]} -->
 *                                         the step shows an animation (src/learn/animations.ts)
 *   <!-- quiz
 *   q: What is printed?
 *   code: |
 *     чоп(2 + 3 * 4);
 *   options: 20 | *14 | 24
 *   explain: First the multiplication.
 *   -->                                   a question; the right options start with `*`
 *   <!-- try
 *   text: Print your name.
 *   starter: |
 *     тағ ном = "";
 *   solution: |
 *     тағ ном = "Алӣ";
 *     чоп(ном);
 *   expect: |
 *     Алӣ
 *   hint: Put your name between the quotes.
 *   -->                                   a small exercise, checked by its output
 *
 * The Tajik and Russian lessons must give the same steps: the same kinds,
 * examples, tasks, animations and answers. Only the texts (and the comments
 * in the code) differ.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const {
  TUTORIAL,
  readText,
  markdownBlocks,
  blockHtml,
  inlineHtml,
  linkParams,
} = require('./learn-data.js');

const LANGUAGES = ['tj', 'ru'];
const TITLE = /^(?:Дарси|Урок) (\d+)\. (.+)$/;
const RUN_LINK = /^\[▶[^\]]*\]\(https:\/\/lindentechde\.github\.io\/Somon-Script\/#([^)]*)\)$/;
const INPUT_LABEL = /^(Вуруд|Ввод):$/;
const PITFALLS = /^(Хатоҳои маъмул|Частые ошибки)$/;
const TASKS = /^(Супоришҳо|Задачи)$/;
const TASK_LINK = /\.\.\/tasks\/([^/]+)\/README\.md/;

/** The lesson files, `01-chop.md` … */
function lessonFiles() {
  return fs
    .readdirSync(path.join(TUTORIAL, 'tj'))
    .filter(file => /^\d\d-.*\.md$/.test(file))
    .sort();
}

/**
 * The fields of a `quiz` or `try` comment: `key: value` lines, and `key: |`
 * followed by lines indented by two spaces.
 */
function directiveFields(body, where) {
  const fields = {};
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const field = /^([a-z]+):(?: (.*))?$/.exec(line);
    if (!field) throw new Error(`${where}: cannot read '${line}'`);
    if (field[2] === '|') {
      const text = [];
      while (i + 1 < lines.length && (lines[i + 1].startsWith('  ') || lines[i + 1] === '')) {
        text.push(lines[++i].slice(2));
      }
      fields[field[1]] = `${text.join('\n').replace(/\n+$/, '')}\n`;
    } else {
      fields[field[1]] = field[2] ?? '';
    }
  }
  return fields;
}

function needFields(fields, names, where) {
  for (const name of names) {
    if (fields[name] === undefined) throw new Error(`${where}: no '${name}:'`);
  }
}

/** A step of a `quiz` or `try` comment. */
function directiveStep(kind, body, title, where) {
  const fields = directiveFields(body, where);
  if (kind === 'quiz') {
    needFields(fields, ['q', 'options'], where);
    const options = fields.options.split(' | ');
    const answer = options.flatMap((option, index) => (option.startsWith('*') ? [index] : []));
    if (answer.length === 0) throw new Error(`${where}: no right option (it starts with '*')`);
    return {
      kind,
      title,
      question: inlineHtml(fields.q),
      code: fields.code,
      options: options.map(option => inlineHtml(option.replace(/^\*/, ''))),
      answer,
      explain: fields.explain === undefined ? undefined : inlineHtml(fields.explain),
    };
  }
  needFields(fields, ['text', 'starter', 'solution', 'expect'], where);
  return {
    kind,
    title,
    text: inlineHtml(fields.text),
    starter: fields.starter,
    solution: fields.solution,
    input: fields.input ?? '',
    expect: fields.expect,
    hint: fields.hint === undefined ? undefined : inlineHtml(fields.hint),
  };
}

/** The animation of an `anim:` comment. */
function animation(text, where) {
  const match = /^anim:\s*([\w-]+)\s*(\{[\s\S]*\})?\s*$/.exec(text);
  if (!match) throw new Error(`${where}: cannot read '<!-- ${text} -->'`);
  return { name: match[1], params: match[2] ? JSON.parse(match[2]) : {} };
}

const html = blocks => blocks.map(blockHtml).join('');

const withoutComments = blocks => blocks.filter(block => block.type !== 'comment');

/**
 * Where the code of the ▶ link at `link` is, among the blocks from `from`:
 * the code block above it, and the input block between them after `Вуруд:`.
 */
function codeOf(blocks, link, from, where) {
  let code = link - 1;
  while (code >= from && blocks[code].type !== 'fence') code--;
  const label = blocks[code - 1];
  if (
    code - 2 >= from &&
    label.type === 'p' &&
    INPUT_LABEL.test(label.text) &&
    blocks[code - 2].type === 'fence'
  ) {
    return { code: code - 2, input: true };
  }
  if (code < from) throw new Error(`${where}: a ▶ link without code above it`);
  return { code, input: false };
}

/** A step with the animation of each `anim:` comment its blocks have (one at most). */
function withAnimation(step, comments, where) {
  if (comments.length > 1) throw new Error(`${where}: two animations in one step`);
  if (comments.length === 1) step.anim = comments[0].anim;
  return step;
}

/** One example step for each ▶ link of the blocks (`links`, their indexes). */
function exampleSteps(blocks, links, title, where) {
  const steps = [];
  let from = 0;
  for (const link of links) {
    const { code, input } = codeOf(blocks, link, from, where);
    const before = html(withoutComments(blocks.slice(from, code)));
    if (steps.length > 0) steps[steps.length - 1].after += before;
    const { decode } = linkParams(RUN_LINK.exec(blocks[link].text)[1]);
    steps.push({
      kind: 'example',
      title,
      html: steps.length === 0 ? before : '',
      code: decode('c'),
      input: input ? decode('i') : '',
      after: '',
    });
    from = link + 1;
  }
  steps[steps.length - 1].after += html(withoutComments(blocks.slice(from)));
  return steps;
}

/**
 * The steps of a run of blocks without `step`, `quiz` or `try` comments: one
 * text step, or an example step for each ▶ link.
 */
function runSteps(blocks, title, role, where) {
  const links = blocks.flatMap((block, index) =>
    block.type === 'p' && RUN_LINK.test(block.text) ? [index] : []
  );
  const anims = blocks.flatMap((block, index) =>
    block.type === 'comment' ? [{ index, anim: animation(block.text, where) }] : []
  );
  if (links.length === 0) {
    const prose = withoutComments(blocks);
    if (prose.length === 0 && anims.length === 0) return [];
    const step = { kind: 'text', title, html: html(prose) };
    if (role) step.role = role;
    return [withAnimation(step, anims, where)];
  }
  const steps = exampleSteps(blocks, links, title, where);
  // An animation belongs to the example of the last link above it (the first one above none)
  steps.forEach((step, index) =>
    withAnimation(
      step,
      anims.filter(
        ({ index: at }) => Math.max(0, links.filter(link => link < at).length - 1) === index
      ),
      where
    )
  );
  return steps;
}

/** The steps of one `##` section. */
function sectionSteps(section, where) {
  const title = inlineHtml(section.title);
  if (TASKS.test(section.title)) {
    return section.blocks.flatMap(block =>
      block.type === 'ol' || block.type === 'ul'
        ? block.items.map(item => {
            const task = TASK_LINK.exec(item);
            if (!task) throw new Error(`${where}: '${item}' is not a link to a task`);
            return { kind: 'task', task: task[1] };
          })
        : []
    );
  }
  const role = PITFALLS.test(section.title) ? 'pitfalls' : undefined;
  const steps = [];
  let run = [];
  const flush = () => {
    steps.push(...runSteps(run, title, role, where));
    run = [];
  };
  for (const block of section.blocks) {
    const directive = block.type === 'comment' && /^(step|quiz|try)\b/.exec(block.text);
    if (!directive) {
      run.push(block);
      continue;
    }
    flush();
    if (directive[1] !== 'step') {
      steps.push(directiveStep(directive[1], block.text.slice(directive[1].length), title, where));
    }
  }
  flush();
  return steps;
}

/** One lesson in one language: its number, title and steps. */
function parseLesson(markdown, where) {
  const blocks = markdownBlocks(markdown);
  const heading = blocks.shift();
  const title = heading?.type === 'heading' && heading.level === 1 && TITLE.exec(heading.text);
  if (!title) throw new Error(`${where}: no title '# Дарси N. …'`);
  const end = blocks.findIndex(block => block.type === 'hr');
  const body = end === -1 ? blocks : blocks.slice(0, end);
  const sections = [{ title: '', blocks: [] }];
  for (const block of body) {
    if (block.type === 'heading' && block.level === 2) {
      sections.push({ title: block.text, blocks: [] });
    } else {
      sections[sections.length - 1].blocks.push(block);
    }
  }
  const [intro, ...rest] = sections;
  const steps = [];
  if (intro.blocks.length > 0) {
    steps.push({
      kind: 'text',
      role: 'intro',
      title: inlineHtml(title[2]),
      html: html(intro.blocks),
    });
  }
  rest.forEach(section => steps.push(...sectionSteps(section, `${where} (${section.title})`)));
  return { n: Number(title[1]), title: inlineHtml(title[2]), steps };
}

/** What must be the same in both languages, by kind of step. */
const SAME = {
  text: ['kind', 'role', 'anim'],
  example: ['kind', 'input', 'anim'],
  quiz: ['kind', 'answer'],
  try: ['kind', 'solution', 'input', 'expect'],
  task: ['kind', 'task'],
};
/** What each language has its own of. */
const OWN = {
  text: ['title', 'html'],
  example: ['title', 'html', 'code', 'after'],
  quiz: ['title', 'question', 'code', 'options', 'explain'],
  try: ['title', 'text', 'starter', 'hint'],
  task: [],
};

/** The steps of both languages as one, with the texts of each: { tj, ru }. */
function mergeSteps(file, versions) {
  const [tj, ru] = versions;
  if (tj.steps.length !== ru.steps.length) {
    throw new Error(`${file}: ${tj.steps.length} steps in Tajik, ${ru.steps.length} in Russian`);
  }
  const n = file.slice(0, 2);
  const counts = {};
  return tj.steps.map((step, index) => {
    const other = ru.steps[index];
    const where = `${file}, step ${index + 1} (${step.kind})`;
    for (const key of SAME[step.kind] ?? []) {
      if (JSON.stringify(step[key]) !== JSON.stringify(other[key])) {
        throw new Error(`${where}: '${key}' differs between Tajik and Russian`);
      }
    }
    const id =
      step.kind === 'task'
        ? `${n}-task-${step.task}`
        : step.role === 'intro'
          ? `${n}-intro`
          : `${n}-${step.kind}-${(counts[step.kind] = (counts[step.kind] ?? 0) + 1)}`;
    const merged = { id };
    for (const key of SAME[step.kind]) if (step[key] !== undefined) merged[key] = step[key];
    for (const key of OWN[step.kind]) {
      if (step[key] === undefined && other[key] === undefined) continue;
      merged[key] = { tj: step[key], ru: other[key] };
    }
    return merged;
  });
}

/** Every lesson, in order, both languages in one. */
function lessons() {
  return lessonFiles().map(file => {
    const versions = LANGUAGES.map(language =>
      parseLesson(
        readText(path.join(TUTORIAL, language, file)),
        `docs/tutorial/${language}/${file}`
      )
    );
    if (versions[0].n !== versions[1].n || versions[0].n !== Number(file.slice(0, 2))) {
      throw new Error(`${file}: the lesson's number differs from its file's`);
    }
    return {
      id: file.replace(/\.md$/, ''),
      n: versions[0].n,
      title: { tj: versions[0].title, ru: versions[1].title },
      steps: mergeSteps(file, versions),
    };
  });
}

module.exports = { lessons, parseLesson, mergeSteps, directiveFields };
