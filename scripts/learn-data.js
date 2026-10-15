/**
 * The data of the tutorial and the playground, for the pages that show them
 * (scripts/build-playground.js, scripts/build-learn.js): the words to
 * highlight, the examples (playground/examples), the tasks with their
 * statements and tests (docs/tutorial/tasks), and the small Markdown to HTML
 * conversion their texts need.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXAMPLES = path.join(ROOT, 'playground', 'examples');
const TUTORIAL = path.join(ROOT, 'docs', 'tutorial');
const TASKS = path.join(TUTORIAL, 'tasks');
const LESSONS = path.join(TUTORIAL, 'tj');
/** Where the tutorial's ▶ links open the playground. */
const PLAYGROUND = 'https://lindentechde.github.io/Somon-Script/';

/** Kinds of words for highlighting (src/lsp/keywords.ts) → class names of playground/src/style.css. */
const WORD_CLASSES = {
  declaration: 'kw',
  control: 'kw',
  operator: 'kw',
  modifier: 'kw',
  literal: 'lit',
  type: 'type',
  utilityType: 'type',
  builtin: 'builtin',
};

/** Built-in functions the keyword tables do not list. */
const BUILTIN_FUNCTIONS = ['хондан', 'хонданиРақам'];

/** The words to highlight and their kinds: { word: 'kw' | 'lit' | 'type' | 'builtin' }. */
function words(distDir) {
  const { KEYWORD_INFO } = require(path.join(distDir, 'lsp', 'keywords.js'));
  const result = {};
  for (const [word, info] of KEYWORD_INFO) {
    if (WORD_CLASSES[info.category]) result[word] = WORD_CLASSES[info.category];
  }
  for (const name of BUILTIN_FUNCTIONS) result[name] = 'builtin';
  return result;
}

/**
 * A text file with LF line ends: a checkout on Windows may have CRLF ones, and
 * the pages are the same on every system.
 */
function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function examples() {
  const manifest = JSON.parse(readText(path.join(EXAMPLES, 'examples.json')));
  return manifest.map(example => ({
    id: example.id,
    name: example.name,
    code: readText(path.join(EXAMPLES, example.file)),
    input: example.input || '',
  }));
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** An `href` of a link: links to the web stay, links to other pages of the tutorial become text. */
const WEB_LINK = /^https?:\/\//;

/** A line of Markdown as HTML: `код`, **bold**, [links](https://…) and <https://…>. */
function inlineHtml(line) {
  return line
    .split('`')
    .map((part, index) =>
      index % 2 === 1
        ? `<code>${escapeHtml(part)}</code>`
        : escapeHtml(part)
            .replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1">$1</a>')
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) =>
              WEB_LINK.test(href) ? `<a href="${href}">${text}</a>` : text
            )
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    )
    .join('');
}

const FENCE = /^(`{3,})(\S*)\s*$/;
const LIST_ITEM = /^(?:(-)|(\d+)\.) (.*)$/;

/**
 * The blocks of a Markdown text, in order:
 *   { type: 'p', text }                     a paragraph, its lines joined
 *   { type: 'ul' | 'ol', items: [text] }    a list
 *   { type: 'table', rows: [[cell]] }       a table (its first row is the header)
 *   { type: 'fence', lang, text }           a fenced code block
 *   { type: 'heading', level, text }        `## …`
 *   { type: 'comment', text }               `<!-- … -->`, what is inside it
 *   { type: 'hr' }                          `---`
 */
function markdownBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const closed = closedBlock(lines, i);
    if (closed || lines[i].trim() === '') {
      if (open) blocks.push(open);
      open = null;
      if (closed) {
        blocks.push(closed.block);
        i = closed.end;
      }
      continue;
    }
    const next = addLine(open, lines[i]);
    if (open && next !== open) blocks.push(open);
    open = next;
  }
  if (open) blocks.push(open);
  return blocks;
}

/** A block that begins at line `i` and ends there or at its closing line: { block, end }. */
function closedBlock(lines, i) {
  const line = lines[i];
  const fence = FENCE.exec(line);
  if (fence) {
    let end = i + 1;
    while (end < lines.length && lines[end] !== fence[1]) end++;
    const text = lines.slice(i + 1, end).join('\n');
    return { block: { type: 'fence', lang: fence[2], text }, end };
  }
  if (line.startsWith('<!--')) {
    let end = i;
    while (end < lines.length && !lines[end].includes('-->')) end++;
    const text = lines.slice(i, end + 1).join('\n');
    return { block: { type: 'comment', text: text.slice(4, text.lastIndexOf('-->')).trim() }, end };
  }
  const heading = /^(#{1,6}) (.*)$/.exec(line);
  if (heading) {
    return { block: { type: 'heading', level: heading[1].length, text: heading[2] }, end: i };
  }
  if (/^-{3,}\s*$/.test(line)) return { block: { type: 'hr' }, end: i };
  return undefined;
}

/** The row under a table's header (`| --- |`), which only aligns. */
const ALIGN_ROW = /^\|[\s:|-]+\|\s*$/;

/** A line added to the block it goes on with, or the block it begins: the block open after it. */
function addLine(open, line) {
  const item = LIST_ITEM.exec(line);
  if (line.startsWith('|')) {
    const table = open?.type === 'table' ? open : { type: 'table', rows: [] };
    if (!ALIGN_ROW.test(line)) {
      table.rows.push(
        line
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map(cell => cell.trim())
      );
    }
    return table;
  }
  if (item) {
    const type = item[1] ? 'ul' : 'ol';
    const list = open?.type === type ? open : { type, items: [] };
    list.items.push(item[3]);
    return list;
  }
  if (open?.type === 'ul' || open?.type === 'ol') {
    // A line that goes on with the item above it
    open.items[open.items.length - 1] += ` ${line.trim()}`;
    return open;
  }
  if (open?.type === 'p') {
    open.text += ` ${line.trim()}`;
    return open;
  }
  return { type: 'p', text: line.trim() };
}

/** One block as HTML; headings, comments and rules have none. */
function blockHtml(block) {
  switch (block.type) {
    case 'p':
      return `<p>${inlineHtml(block.text)}</p>`;
    case 'ul':
    case 'ol':
      return `<${block.type}>${block.items.map(item => `<li>${inlineHtml(item)}</li>`).join('')}</${block.type}>`;
    case 'table': {
      const [head, ...body] = block.rows;
      const row = (cells, tag) =>
        `<tr>${cells.map(cell => `<${tag}>${inlineHtml(cell)}</${tag}>`).join('')}</tr>`;
      return `<table><thead>${row(head, 'th')}</thead><tbody>${body.map(cells => row(cells, 'td')).join('')}</tbody></table>`;
    }
    case 'fence':
      return block.lang === 'som'
        ? `<pre class="som">${escapeHtml(block.text)}</pre>`
        : `<pre>${escapeHtml(block.text)}</pre>`;
    default:
      return '';
  }
}

/** Markdown as HTML: paragraphs, lists, tables, code blocks, `код`, **bold** and links. */
function markdownHtml(markdown) {
  return markdownBlocks(markdown).map(blockHtml).join('');
}

/** The part of a task page from its heading `## <heading> <id>:` to `### <end>`. */
function section(page, id, heading, end) {
  const start = page.indexOf(`## ${heading} ${id}:`);
  const stop = page.indexOf(`### ${end}`, start);
  if (start === -1 || stop === -1)
    throw new Error(`docs/tutorial/tasks/${id}: no section '${heading}'`);
  return page.slice(page.indexOf('\n', start) + 1, stop).trim();
}

/** What a ▶ link of the tutorial opens: its parameters, the code and input decoded. */
function linkParams(hash) {
  const params = new URLSearchParams(hash);
  const decode = name => Buffer.from(params.get(name) ?? '', 'base64url').toString('utf8');
  return { params, decode };
}

/** The ids of the tasks in the order the lessons give them. */
function taskOrder() {
  return fs
    .readdirSync(LESSONS)
    .filter(file => /^\d\d-.*\.md$/.test(file))
    .sort()
    .flatMap(file =>
      [...readText(path.join(LESSONS, file)).matchAll(/\.\.\/tasks\/([^/]+)\//g)].map(
        match => match[1]
      )
    );
}

/**
 * The tasks of the tutorial, from their pages (docs/tutorial/tasks/<id>/README.md):
 * the title and statement in Tajik, Russian and English, and the starting program, input
 * and tests of the page's playground link (which scripts/tutorial-links.js
 * makes from the code above it and the task's tests).
 */
function tasks() {
  const order = taskOrder();
  const rank = id => (order.includes(id) ? order.indexOf(id) : order.length);
  return fs
    .readdirSync(TASKS)
    .filter(id => fs.existsSync(path.join(TASKS, id, 'tests')))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map(id => {
      const page = readText(path.join(TASKS, id, 'README.md'));
      const title = /^# (.+?) \/ (.+?) \/ (.+)$/m.exec(page);
      const link = /\(https:\/\/lindentechde\.github\.io\/Somon-Script\/#([^)]*)\)/.exec(page);
      if (!title || !link)
        throw new Error(`docs/tutorial/tasks/${id}: no title or playground link`);
      const { decode } = linkParams(link[1]);
      return {
        id,
        lesson: Number(id.slice(0, 2)),
        title: { tj: title[1], ru: title[2], en: title[3] },
        text: {
          tj: markdownHtml(section(page, id, 'Масъала', 'Мисол')),
          ru: markdownHtml(section(page, id, 'Задача', 'Пример')),
          en: markdownHtml(section(page, id, 'Task', 'Example')),
        },
        code: decode('c'),
        input: decode('i'),
        tests: JSON.parse(decode('t')),
      };
    });
}

module.exports = {
  PLAYGROUND,
  TUTORIAL,
  readText,
  words,
  examples,
  tasks,
  escapeHtml,
  inlineHtml,
  markdownBlocks,
  blockHtml,
  markdownHtml,
  linkParams,
};
