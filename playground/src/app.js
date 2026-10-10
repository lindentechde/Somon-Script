/*
 * The playground's page: the editor, the input, running the program in a Web
 * Worker and showing what it prints. The worker (src/playground/worker.ts,
 * bundled by scripts/build-playground.js into `window.SOMON_WORKER`) compiles
 * and runs the program; this page only shows the result. A program that runs
 * longer than the time limit is stopped by ending its worker.
 *
 * Works from a web server and from a file opened from disk (file://): the
 * worker starts from a Blob URL, and nothing is loaded from the network.
 */
(function () {
  'use strict';

  var STRINGS = window.SOMON_STRINGS;
  var EXAMPLES = window.SOMON_EXAMPLES;
  var STORAGE_KEY = 'somon-playground';
  var TIMEOUTS = [2, 5, 10, 30, 60];
  var DEFAULT_TIMEOUT = 5;

  var $ = function (id) {
    return document.getElementById(id);
  };
  var codeInput = $('code');
  var highlightLayer = $('highlight');
  var gutter = $('gutter');
  var marksLayer = $('marks');
  var editor = $('editor');
  var inputField = $('input');
  var output = $('output');
  var statusLine = $('status');
  var jsPanel = $('js-panel');
  var jsOutput = $('js');
  var runButton = $('run');
  var stopButton = $('stop');
  var exampleSelect = $('example');
  var languageSelect = $('language');
  var timeoutSelect = $('timeout');
  var showJs = $('show-js');

  var state = initialState();
  /** Lines with problems: { line: 'error' | 'warning' }. */
  var marks = {};
  /** The running program: its worker, timer and what it printed. */
  var current = null;
  /** A worker started ahead, so that the next run does not wait for the compiler to load. */
  var spare = null;
  var workerUrl = null;

  // ---------------------------------------------------------------------------
  // State: the link (#…), then what was saved, then the first example
  // ---------------------------------------------------------------------------

  function initialState() {
    var saved = load();
    var state = {
      code: saved.code,
      input: saved.input || '',
      language: STRINGS[saved.language] ? saved.language : 'tj',
      showJs: Boolean(saved.showJs),
      timeout: TIMEOUTS.indexOf(saved.timeout) !== -1 ? saved.timeout : DEFAULT_TIMEOUT,
      example: saved.example || '',
    };
    var query = new URLSearchParams(location.search);
    if (STRINGS[query.get('lang')]) state.language = query.get('lang');
    var timeout = Number(query.get('timeout'));
    if (timeout > 0) state.timeout = timeout;
    var linked = fromHash(location.hash);
    if (linked) {
      state.code = linked.code;
      state.input = linked.input;
      state.example = linked.example || '';
    }
    if (typeof state.code !== 'string') {
      state.code = EXAMPLES[0].code;
      state.input = EXAMPLES[0].input || '';
      state.example = EXAMPLES[0].id;
    }
    return state;
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (error) {
      // Storage can be unavailable (private windows, some file:// pages) or hold other data
      return {};
    }
  }

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        // Not saved: the page works without storage
      }
    }, 300);
  }

  // ---------------------------------------------------------------------------
  // Links: #c=<code>&i=<input> (UTF-8 in base64url), or #example=<id>
  // ---------------------------------------------------------------------------

  function encode(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = '';
    for (var index = 0; index < bytes.length; index++) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(text) {
    var base64 = text.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new TextDecoder().decode(bytes);
  }

  function fromHash(hash) {
    var params = new URLSearchParams(hash.replace(/^#/, ''));
    try {
      if (params.has('c')) {
        return {
          code: decode(params.get('c')),
          input: params.has('i') ? decode(params.get('i')) : '',
        };
      }
    } catch (error) {
      return null;
    }
    var example = findExample(params.get('example'));
    return example ? { code: example.code, input: example.input || '', example: example.id } : null;
  }

  function linkTo(code, input) {
    var hash = '#c=' + encode(code) + (input ? '&i=' + encode(input) : '');
    return location.href.split('#')[0] + hash;
  }

  function findExample(id) {
    for (var index = 0; index < EXAMPLES.length; index++) {
      if (EXAMPLES[index].id === id) return EXAMPLES[index];
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // The words of the page
  // ---------------------------------------------------------------------------

  function text(key, values) {
    var value = STRINGS[state.language][key] || STRINGS.tj[key] || key;
    return value.replace(/\{(\w+)\}/g, function (_, name) {
      return values && name in values ? values[name] : '';
    });
  }

  function applyLanguage() {
    document.documentElement.lang = state.language === 'tj' ? 'tg' : state.language;
    document.title = 'SomonScript — ' + text('title');
    languageSelect.value = state.language;
    var elements = document.querySelectorAll('[data-text]');
    for (var index = 0; index < elements.length; index++) {
      elements[index].textContent = text(elements[index].getAttribute('data-text'));
    }
    codeInput.setAttribute('aria-label', text('codeLabel'));
    inputField.placeholder = text('inputHint');

    exampleSelect.innerHTML = '';
    addOption(exampleSelect, '', text('chooseExample'));
    EXAMPLES.forEach(function (example) {
      addOption(exampleSelect, example.id, example.name[state.language] || example.name.tj);
    });
    exampleSelect.value = state.example;

    timeoutSelect.innerHTML = '';
    var timeouts =
      TIMEOUTS.indexOf(state.timeout) === -1 ? TIMEOUTS.concat([state.timeout]) : TIMEOUTS;
    timeouts.forEach(function (seconds) {
      addOption(timeoutSelect, String(seconds), text('seconds', { n: seconds }));
    });
    timeoutSelect.value = String(state.timeout);
  }

  function addOption(select, value, label) {
    var option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  // ---------------------------------------------------------------------------
  // The editor
  // ---------------------------------------------------------------------------

  function renderEditor() {
    var source = codeInput.value;
    // A space after the text, so that a last empty line has its height
    highlightLayer.innerHTML = window.highlightSomon(source) + ' ';
    var lines = source.split('\n').length;
    var numbers = [];
    for (var line = 1; line <= lines; line++) {
      numbers.push(
        marks[line] ? '<span class="' + marks[line] + '">' + line + '</span>' : String(line)
      );
    }
    gutter.innerHTML = numbers.join('\n');
  }

  function renderMarks() {
    marksLayer.innerHTML = '';
    Object.keys(marks).forEach(function (line) {
      var mark = document.createElement('div');
      mark.className = marks[line];
      mark.style.top = 'calc(var(--pad) + ' + (Number(line) - 1) + ' * var(--line))';
      marksLayer.appendChild(mark);
    });
    renderEditor();
  }

  function mark(line, kind) {
    if (!line) return;
    if (marks[line] !== 'error') marks[line] = kind;
  }

  function clearMarks() {
    marks = {};
    renderMarks();
  }

  /** Selects a line of the program and scrolls to it. */
  function goToLine(line) {
    var lines = codeInput.value.split('\n');
    var start = 0;
    for (var index = 0; index < line - 1 && index < lines.length; index++) {
      start += lines[index].length + 1;
    }
    var end = start + (lines[line - 1] || '').length;
    codeInput.focus();
    codeInput.setSelectionRange(start, end);
    var lineHeight = parseFloat(getComputedStyle(codeInput).lineHeight) || 21;
    var top = (line - 1) * lineHeight;
    if (top < editor.scrollTop || top > editor.scrollTop + editor.clientHeight - 2 * lineHeight) {
      editor.scrollTop = Math.max(0, top - editor.clientHeight / 3);
    }
  }

  /** Inserts text at the cursor, so that undo still works where the browser supports it. */
  function insert(textToInsert) {
    if (!document.execCommand || !document.execCommand('insertText', false, textToInsert)) {
      codeInput.setRangeText(textToInsert, codeInput.selectionStart, codeInput.selectionEnd, 'end');
      onCodeChanged();
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      run();
    } else if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      insert('  ');
    } else if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
      // A new line keeps the indentation of the line before, and indents after `{`
      var before = codeInput.value.slice(0, codeInput.selectionStart);
      var lineStart = before.lastIndexOf('\n') + 1;
      var indent = /^[ \t]*/.exec(before.slice(lineStart))[0];
      if (/[{([]\s*$/.test(before)) indent += '  ';
      event.preventDefault();
      insert('\n' + indent);
    }
  }

  function onCodeChanged() {
    state.code = codeInput.value;
    if (Object.keys(marks).length > 0) marks = {};
    renderMarks();
    save();
  }

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------

  function print(textToPrint, kind, line) {
    var span = document.createElement('span');
    if (kind) span.className = kind;
    span.textContent = textToPrint.endsWith('\n') ? textToPrint : textToPrint + '\n';
    if (line) {
      span.setAttribute('data-line', String(line));
      span.title = text('line', { n: line });
    }
    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
  }

  function clearOutput() {
    output.textContent = '';
    statusLine.textContent = '';
  }

  function setStatus(message) {
    statusLine.textContent = message;
  }

  function setRunning(running) {
    runButton.disabled = running;
    stopButton.hidden = !running;
  }

  function showCode(code) {
    jsOutput.textContent = code;
  }

  // ---------------------------------------------------------------------------
  // Running
  // ---------------------------------------------------------------------------

  function startWorker() {
    if (!workerUrl) {
      workerUrl = URL.createObjectURL(new Blob([window.SOMON_WORKER], { type: 'text/javascript' }));
    }
    return new Worker(workerUrl);
  }

  function prepareSpare() {
    if (spare) return;
    try {
      spare = startWorker();
    } catch (error) {
      spare = null;
    }
  }

  function run() {
    stop(null);
    clearOutput();
    marks = {};
    renderMarks();
    showCode('');
    var worker;
    try {
      worker = spare || startWorker();
    } catch (error) {
      print(text('noWorker'), 'error');
      return;
    }
    spare = null;
    current = { worker: worker, timer: null, started: 0, printed: false, failed: false };
    worker.onmessage = function (event) {
      if (current && current.worker === worker) handle(event.data);
    };
    worker.onerror = function (event) {
      event.preventDefault();
      if (current && current.worker === worker) {
        print(event.message || text('noWorker'), 'error');
        finish(text('failed'));
      }
    };
    worker.postMessage({ source: state.code, input: state.input, language: state.language });
    setRunning(true);
    setStatus(text('running'));
    setTimeout(prepareSpare, 50);
  }

  function handle(message) {
    switch (message.type) {
      case 'compiled':
        showCode(message.code);
        current.started = Date.now();
        current.timer = setTimeout(function () {
          print(text('timeout'), 'error');
          stop(text('stopped'));
        }, state.timeout * 1000);
        problems(message.diagnostics, 'warning');
        break;
      case 'notCompiled':
        problems(message.diagnostics, 'error');
        print(message.summary, 'error');
        finish(text('notCompiled'));
        break;
      case 'output':
        current.printed = true;
        print(
          message.text,
          message.stream === 'error' ? 'error' : message.stream === 'warn' ? 'warning' : ''
        );
        break;
      case 'outputLimit':
        print(text('outputLimit', { n: message.lines }), 'note');
        break;
      case 'runtimeError':
        current.failed = true;
        mark(message.line, 'error');
        renderMarks();
        print(message.text, 'error', message.line);
        break;
      case 'done':
        if (!current.printed && !current.failed) print(text('nothingPrinted'), 'note');
        finish(
          current.failed ? text('failed') : text('done', { ms: Date.now() - current.started })
        );
        break;
    }
  }

  function problems(diagnostics, kind) {
    (diagnostics || []).forEach(function (problem) {
      mark(problem.line, problem.severity || kind);
      print(problem.text, problem.severity || kind, problem.line);
    });
    renderMarks();
  }

  function finish(message) {
    if (!current) return;
    clearTimeout(current.timer);
    current.worker.terminate();
    current = null;
    setRunning(false);
    setStatus(message);
  }

  /** Stops the running program, if any; `message` says why (null: a new run starts). */
  function stop(message) {
    if (!current) return;
    finish(message || '');
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  function share() {
    var url = linkTo(state.code, state.input);
    try {
      history.replaceState(null, '', url);
    } catch (error) {
      location.hash = url.slice(url.indexOf('#'));
    }
    var copied = navigator.clipboard && navigator.clipboard.writeText(url);
    if (copied) {
      copied.then(
        function () {
          setStatus(text('linkCopied'));
        },
        function () {
          setStatus(text('linkReady'));
        }
      );
    } else {
      setStatus(text('linkReady'));
    }
  }

  function chooseExample() {
    var example = findExample(exampleSelect.value);
    if (!example) return;
    state.example = example.id;
    state.code = example.code;
    state.input = example.input || '';
    codeInput.value = state.code;
    inputField.value = state.input;
    clearOutput();
    showCode('');
    clearMarks();
    save();
  }

  function init() {
    $('version').textContent = window.SOMON_VERSION;
    codeInput.value = state.code;
    inputField.value = state.input;
    showJs.checked = state.showJs;
    jsPanel.hidden = !state.showJs;
    applyLanguage();
    renderEditor();

    codeInput.addEventListener('input', function () {
      state.example = '';
      exampleSelect.value = '';
      onCodeChanged();
    });
    codeInput.addEventListener('keydown', onKeyDown);
    // A click below the last line puts the cursor at the end
    editor.addEventListener('mousedown', function (event) {
      if (event.target === editor || event.target.className === 'editor-inner') {
        event.preventDefault();
        codeInput.focus();
        codeInput.setSelectionRange(codeInput.value.length, codeInput.value.length);
      }
    });
    inputField.addEventListener('input', function () {
      state.input = inputField.value;
      save();
    });
    inputField.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        run();
      }
    });
    output.addEventListener('click', function (event) {
      var target = event.target.closest && event.target.closest('[data-line]');
      if (target) goToLine(Number(target.getAttribute('data-line')));
    });
    runButton.addEventListener('click', run);
    stopButton.addEventListener('click', function () {
      print(text('stopped'), 'note');
      stop(text('stopped'));
    });
    $('share').addEventListener('click', share);
    exampleSelect.addEventListener('change', chooseExample);
    languageSelect.addEventListener('change', function () {
      state.language = languageSelect.value;
      applyLanguage();
      save();
    });
    timeoutSelect.addEventListener('change', function () {
      state.timeout = Number(timeoutSelect.value);
      save();
    });
    showJs.addEventListener('change', function () {
      state.showJs = showJs.checked;
      jsPanel.hidden = !state.showJs;
      save();
    });
    window.addEventListener('hashchange', function () {
      var linked = fromHash(location.hash);
      if (!linked) return;
      state.code = linked.code;
      state.input = linked.input;
      state.example = linked.example || '';
      codeInput.value = state.code;
      inputField.value = state.input;
      exampleSelect.value = state.example;
      clearMarks();
      save();
    });
    prepareSpare();
  }

  init();
})();
