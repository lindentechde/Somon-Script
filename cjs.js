(function () {
  'use strict';

  var modules = {
    '../../../../var/folders/s_/vj2sfwlj4qv71gx_5v9zpkt00000gn/T/somon-cli-program-FS0Sfw/m.som':
      function (module, exports, require) {
        function x() {}
        module.exports.x = x;
      },
  };

  var cache = {};

  function require(id) {
    if (cache[id]) return cache[id].exports;

    var module = (cache[id] = { exports: {} });
    modules[id](module, module.exports, require);

    return module.exports;
  }

  // Start with entry point
  require('../../../../var/folders/s_/vj2sfwlj4qv71gx_5v9zpkt00000gn/T/somon-cli-program-FS0Sfw/m.som');
})();
