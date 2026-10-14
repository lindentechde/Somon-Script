/*
 * Syntax highlighting of SomonScript for the playground's editor: comments,
 * strings, numbers, and the words of the language by their kind. The words
 * come from the compiler's tables (src/lsp/keywords.ts), put into the page by
 * scripts/build-playground.js as `window.SOMON_WORDS` ({ word: kind }).
 */
(function () {
  'use strict';

  var TOKEN = new RegExp(
    [
      // Comments
      '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$))',
      // Strings and template strings (to the end of the line or text when not closed)
      '("(?:[^"\\\\\\n]|\\\\.)*"?|\'(?:[^\'\\\\\\n]|\\\\.)*\'?|`(?:[^`\\\\]|\\\\[\\s\\S])*`?)',
      // Numbers
      '(\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][-+]?\\d+)?\\b)',
      // Words
      '([\\p{L}_$][\\p{L}\\p{N}\\p{M}_$]*)',
    ].join('|'),
    'gu'
  );

  function escape(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** The kind of a word, as a class name: `kw`, `type`, `lit`, `builtin`, or none. */
  function kindOf(word, before) {
    var kind = window.SOMON_WORDS[word];
    // `о.сабт`: a member, not a keyword
    if (!kind || /\.\s*$/.test(before)) return '';
    return kind;
  }

  /** HTML of `source` with `<span class="…">` around its tokens. */
  window.highlightSomon = function (source) {
    var html = '';
    var last = 0;
    var match;
    TOKEN.lastIndex = 0;
    while ((match = TOKEN.exec(source)) !== null) {
      if (match[0] === '') {
        TOKEN.lastIndex++;
        continue;
      }
      html += escape(source.slice(last, match.index));
      var kind = '';
      if (match[1]) kind = 'comment';
      else if (match[2]) kind = 'string';
      else if (match[3]) kind = 'number';
      else kind = kindOf(match[4], source.slice(Math.max(0, match.index - 2), match.index));
      html += kind
        ? '<span class="' + kind + '">' + escape(match[0]) + '</span>'
        : escape(match[0]);
      last = match.index + match[0].length;
    }
    return html + escape(source.slice(last));
  };
})();
