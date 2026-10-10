/*
 * The playground's page: the editor, the input, running the program in a Web
 * Worker and showing what it prints. The worker (src/playground/worker.ts,
 * bundled by scripts/build-playground.js into `window.SOMON_WORKER`) compiles
 * and runs the program; this page only shows the result. A program that runs
 * longer than the time limit is stopped by ending its worker.
 *
 * Works from a web server and from a file opened from disk (file://): the
 * worker starts from a Blob URL, and nothing is loaded from the network.
 *
 * The tasks of the tutorial are in the page too (`window.SOMON_TASKS`, from
 * docs/tutorial/tasks): «Масъала» shows a task's statement and starting
 * program, also offline. A task, or a link to one (`&t=` carries its tests),
 * has «Санҷидан», which runs the program on each test, as `npm run check-task`
 * does (scripts/check-task.js), and says which pass.
 */
(function () {
  'use strict';

  var STRINGS = window.SOMON_STRINGS;
  var EXAMPLES = window.SOMON_EXAMPLES;
  var TASKS = window.SOMON_TASKS;
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
  var checkButton = $('check');
  var exampleSelect = $('example');
  var taskSelect = $('task');
  var taskPanel = $('task-panel');
  var languageSelect = $('language');
  var timeoutSelect = $('timeout');
  var showJs = $('show-js');
  var learningMode = $('learning-mode');

  var state = initialState();
  /** Lines with problems: { line: 'error' | 'warning' }. */
  var marks = {};
  /** The running program: its worker, timer and what it printed. */
  var current = null;
  /** The check of a task's tests that is running: { stopped, worker }. */
  var checking = null;
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
      // Warnings for beginners are on unless turned off
      learningMode: saved.learningMode !== false,
      timeout: TIMEOUTS.indexOf(saved.timeout) !== -1 ? saved.timeout : DEFAULT_TIMEOUT,
      example: saved.example || '',
      // The tests of the task a link opened: [{ i: input, o: expected output }]
      tests: validTests(saved.tests),
      // The task of the tutorial being solved, by its id
      task: findTask(saved.task) ? saved.task : '',
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
      state.tests = linked.tests;
      state.task = linked.task || '';
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
  // Links: #c=<code>&i=<input>&t=<tests>&task=<id> (UTF-8 in base64url),
  // #task=<id> or #example=<id>
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
    var task = findTask(params.get('task'));
    try {
      if (params.has('c')) {
        return {
          code: decode(params.get('c')),
          input: params.has('i') ? decode(params.get('i')) : '',
          tests: params.has('t')
            ? validTests(JSON.parse(decode(params.get('t'))))
            : task && task.tests,
          task: task ? task.id : '',
        };
      }
    } catch (error) {
      return null;
    }
    if (task) return { code: task.code, input: task.input, tests: task.tests, task: task.id };
    var example = findExample(params.get('example'));
    return example
      ? { code: example.code, input: example.input || '', example: example.id, tests: null }
      : null;
  }

  /** Tests as a link or the storage gives them: a list of { i, o } strings, or null. */
  function validTests(tests) {
    var valid =
      Array.isArray(tests) &&
      tests.length > 0 &&
      tests.every(function (test) {
        return test && typeof test.i === 'string' && typeof test.o === 'string';
      });
    return valid ? tests : null;
  }

  function linkTo(code, input, tests, task) {
    var hash =
      '#c=' +
      encode(code) +
      (input ? '&i=' + encode(input) : '') +
      (tests ? '&t=' + encode(JSON.stringify(tests)) : '') +
      (task ? '&task=' + task : '');
    return location.href.split('#')[0] + hash;
  }

  function findTask(id) {
    for (var index = 0; index < TASKS.length; index++) {
      if (TASKS[index].id === id) return TASKS[index];
    }
    return null;
  }

  /** The language of task statements: Tajik or Russian. */
  function taskLanguage() {
    return state.language === 'ru' ? 'ru' : 'tj';
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

    // The tasks, by lesson
    taskSelect.innerHTML = '';
    addOption(taskSelect, '', text('chooseTask'));
    var group = null;
    TASKS.forEach(function (task) {
      if (!group || group.lesson !== task.lesson) {
        group = document.createElement('optgroup');
        group.lesson = task.lesson;
        group.label = text('lesson', { n: task.lesson });
        taskSelect.appendChild(group);
      }
      addOption(group, task.id, task.title[taskLanguage()]);
    });
    taskSelect.value = state.task;
    showTask();

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
    checkButton.disabled = running;
    stopButton.hidden = !running;
  }

  function showCheckButton() {
    checkButton.hidden = !state.tests;
  }

  /** The statement of the task being solved, if any. */
  function showTask() {
    var task = findTask(state.task);
    taskPanel.hidden = !task;
    if (!task) return;
    $('task-title').textContent = text('task') + ' ' + task.id + ': ' + task.title[taskLanguage()];
    // The statement is HTML the build made from the task's page in the repository
    $('task-text').innerHTML = task.text[taskLanguage()];
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
    worker.postMessage({
      source: state.code,
      input: state.input,
      language: state.language,
      learningMode: state.learningMode,
    });
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

  /** Stops the running program or check, if any; `message` says why (null: a new run starts). */
  function stop(message) {
    if (checking) {
      checking.stopped = true;
      if (checking.worker) checking.worker.terminate();
      endCheck(message || '');
    }
    if (!current) return;
    finish(message || '');
  }

  // ---------------------------------------------------------------------------
  // Checking a task: the program on each of its tests
  // ---------------------------------------------------------------------------

  /** What a program printed, as it is compared: no spaces at line ends, no empty lines at the end. */
  function normalize(printed) {
    return printed
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(function (line) {
        return line.replace(/\s+$/, '');
      })
      .join('\n')
      .replace(/\n+$/, '');
  }

  /**
   * Runs the program once with `input` in a worker of its own; `done` gets
   * { notCompiled, diagnostics, summary } or { output, error, errorLine, timedOut }.
   */
  function runTest(input, done) {
    var worker = spare || startWorker();
    spare = null;
    setTimeout(prepareSpare, 50);
    checking.worker = worker;
    var lines = [];
    var result = { output: '', error: null, errorLine: 0, timedOut: false };
    var timer = null;
    var end = function () {
      clearTimeout(timer);
      worker.terminate();
      result.output = lines.join('\n');
      done(result);
    };
    worker.onmessage = function (event) {
      if (!checking || checking.stopped || checking.worker !== worker) return;
      var message = event.data;
      if (message.type === 'compiled') {
        timer = setTimeout(function () {
          result.timedOut = true;
          end();
        }, state.timeout * 1000);
      } else if (message.type === 'notCompiled') {
        worker.terminate();
        done({ notCompiled: true, diagnostics: message.diagnostics, summary: message.summary });
      } else if (message.type === 'output') {
        lines.push(message.text);
      } else if (message.type === 'runtimeError') {
        result.error = message.text;
        result.errorLine = message.line;
      } else if (message.type === 'done') {
        end();
      }
    };
    worker.onerror = function (event) {
      event.preventDefault();
      result.error = event.message || text('noWorker');
      end();
    };
    worker.postMessage({ source: state.code, input: input, language: state.language });
  }

  /** Prints text under a label of the report, indented, or «(ҳеҷ чиз)» when empty. */
  function printBlock(label, value, kind) {
    var shown = normalize(value);
    print('   ' + label);
    print((shown === '' ? text('nothing') : shown).replace(/^/gm, '    '), kind);
  }

  function checkTask() {
    if (!state.tests) return;
    stop(null);
    clearOutput();
    marks = {};
    renderMarks();
    showCode('');
    var tests = state.tests;
    var passed = 0;
    var index = 0;
    checking = { stopped: false, worker: null };
    setRunning(true);
    setStatus(text('checking'));
    var next = function () {
      if (index === tests.length) {
        var summary = text('summary', { passed: passed, total: tests.length });
        print(summary, passed === tests.length ? 'pass' : 'error');
        endCheck(summary);
        return;
      }
      var test = tests[index];
      runTest(test.i, function (result) {
        if (checking === null || checking.stopped) return;
        if (result.notCompiled) {
          problems(result.diagnostics, 'error');
          print(result.summary, 'error');
          endCheck(text('notCompiled'));
          return;
        }
        var ok =
          !result.error && !result.timedOut && normalize(result.output) === normalize(test.o);
        print(
          text('testName', { n: index + 1 }) +
            ': ' +
            (ok ? text('testPassed') : text('testFailed')),
          ok ? 'pass' : 'error'
        );
        if (ok) {
          passed++;
        } else {
          if (test.i !== '') printBlock(text('testInput'), test.i);
          printBlock(text('expected'), test.o);
          printBlock(text('printed'), result.output);
          if (result.timedOut) print(text('timeout'), 'error');
          if (result.error) {
            mark(result.errorLine, 'error');
            renderMarks();
            print(result.error, 'error', result.errorLine);
          }
        }
        index++;
        next();
      });
    };
    next();
  }

  function endCheck(message) {
    if (!checking) return;
    checking = null;
    setRunning(false);
    setStatus(message);
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  function share() {
    var url = linkTo(state.code, state.input, state.tests, state.task);
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
    state.tests = null;
    state.task = '';
    taskSelect.value = '';
    showCheckButton();
    showTask();
    codeInput.value = state.code;
    inputField.value = state.input;
    clearOutput();
    showCode('');
    clearMarks();
    save();
  }

  function chooseTask() {
    var task = findTask(taskSelect.value);
    if (!task) return;
    stop(null);
    state.task = task.id;
    state.code = task.code;
    state.input = task.input;
    state.tests = task.tests;
    state.example = '';
    exampleSelect.value = '';
    showCheckButton();
    showTask();
    codeInput.value = state.code;
    inputField.value = state.input;
    clearOutput();
    showCode('');
    clearMarks();
    save();
  }

  function init() {
    $('version').textContent = window.SOMON_VERSION;
    // The page itself, under whatever name it was saved
    $('download').href = location.href.split('#')[0];
    codeInput.value = state.code;
    inputField.value = state.input;
    showJs.checked = state.showJs;
    learningMode.checked = state.learningMode;
    jsPanel.hidden = !state.showJs;
    showCheckButton();
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
    checkButton.addEventListener('click', checkTask);
    stopButton.addEventListener('click', function () {
      print(text('stopped'), 'note');
      stop(text('stopped'));
    });
    $('share').addEventListener('click', share);
    exampleSelect.addEventListener('change', chooseExample);
    taskSelect.addEventListener('change', chooseTask);
    languageSelect.addEventListener('change', function () {
      state.language = languageSelect.value;
      applyLanguage();
      save();
    });
    timeoutSelect.addEventListener('change', function () {
      state.timeout = Number(timeoutSelect.value);
      save();
    });
    learningMode.addEventListener('change', function () {
      state.learningMode = learningMode.checked;
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
      state.tests = linked.tests;
      state.task = linked.task || '';
      showCheckButton();
      showTask();
      codeInput.value = state.code;
      inputField.value = state.input;
      exampleSelect.value = state.example;
      taskSelect.value = state.task;
      clearMarks();
      save();
    });
    prepareSpare();
  }

  init();
})();
