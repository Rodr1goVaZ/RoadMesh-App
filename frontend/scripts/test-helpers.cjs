/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

/** Load a TS unit with explicit dependencies, without booting Expo or reaching the network. */
function loadTypeScript(file, { modules = {}, globals = {} } = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Error,
    require: name => {
      if (!Object.hasOwn(modules, name)) throw new Error(`Missing test dependency: ${name}`);
      return modules[name];
    },
    ...globals,
  });
  return exports;
}

module.exports = { loadTypeScript };
