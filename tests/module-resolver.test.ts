import * as fs from 'fs';
import * as path from 'path';

import { ModuleResolver } from '../src/module-system';
import { isSystemPath } from '../src/module-system/module-resolver';
import { createTempProject, type TempProject } from './helpers/module-project';

/**
 * ModuleResolver: relative, absolute and bare specifiers, extension and index
 * probing, package.json "main"/"exports", baseUrl/paths, module directories, the
 * containment checks and the classification of absolute paths.
 */

describe('ModuleResolver', () => {
  let project: TempProject;
  let from: string;

  beforeEach(() => {
    project = createTempProject('somon-resolver-');
    project.write({ 'src/main.som': '' });
    from = project.file('src/main.som');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    project.remove();
  });

  const resolver = (options: Partial<ConstructorParameters<typeof ModuleResolver>[0]> = {}) =>
    new ModuleResolver({ baseUrl: project.root, ...options });

  /** A directory link that works without privileges on Windows too. */
  const linkDirectory = (target: string, link: string) => fs.symlinkSync(target, link, 'junction');

  describe('options', () => {
    test('a baseUrl is required', () => {
      expect(() => new ModuleResolver()).toThrow(/requires explicit baseUrl/);
      expect(() => new ModuleResolver({ baseUrl: '' })).toThrow(/requires explicit baseUrl/);
    });

    test('extensions default to .som, .js and .json and are reported as a copy', () => {
      const r = resolver();
      const extensions = r.getExtensions();
      expect(extensions).toEqual(['.som', '.js', '.json']);
      extensions.push('.ts');
      expect(r.getExtensions()).toEqual(['.som', '.js', '.json']);
      expect(r.isSupported('.som')).toBe(true);
      expect(r.isSupported('.ts')).toBe(false);
    });

    test('allowJs and resolveJsonModule false keep local .js/.cjs/.mjs and .json files out', () => {
      project.write({ 'src/a.cjs': '', 'src/b.mjs': '', 'src/c.json': '{}', 'src/d.som': '' });
      const both = resolver({ allowJs: false, resolveJsonModule: false });
      for (const file of ['./a.cjs', './b.mjs', './c.json']) {
        expect(() => both.resolve(file, from)).toThrow(/Cannot resolve module/);
      }
      expect(both.resolve('./d', from).extension).toBe('.som');
      const defaults = resolver();
      expect(defaults.resolve('./a.cjs', from).extension).toBe('.cjs');
      expect(defaults.resolve('./c', from).extension).toBe('.json');
    });

    test('updateOptions changes the extensions and mappings used from then on', () => {
      project.write({ 'src/util.js': '', 'lib/x.som': '' });
      const r = resolver();
      expect(r.resolve('./util', from).extension).toBe('.js');
      r.updateOptions({ extensions: ['.som'], paths: { x: ['lib/x'] } });
      expect(r.isSupported('.js')).toBe(false);
      expect(() => r.resolve('./util', from)).toThrow(
        `Cannot resolve module: ${project.file('src/util')}`
      );
      expect(r.resolve('x', from).resolvedPath).toBe(project.file('lib/x.som'));
    });
  });

  describe('relative specifiers', () => {
    test('try the extensions in order: .som before .js before .json', () => {
      project.write({ 'src/a.som': '', 'src/a.js': '', 'src/b.js': '', 'src/b.json': '{}' });
      project.write({ 'src/c.json': '{}' });
      const r = resolver();
      expect(r.resolve('./a', from)).toEqual({
        resolvedPath: project.file('src/a.som'),
        isExternalLibrary: false,
        packageName: undefined,
        extension: '.som',
      });
      expect(r.resolve('./b', from).resolvedPath).toBe(project.file('src/b.js'));
      expect(r.resolve('./c', from).extension).toBe('.json');
    });

    test('a path with its extension is used as it is', () => {
      project.write({ 'src/a.som': '', 'src/a.som.js': '', 'src/data.txt': '' });
      const r = resolver();
      expect(r.resolve('./a.som', from).resolvedPath).toBe(project.file('src/a.som'));
      // Any existing file, whatever its extension
      expect(r.resolve('./data.txt', from)).toMatchObject({
        resolvedPath: project.file('src/data.txt'),
        extension: '.txt',
      });
    });

    test('a directory resolves to its index file, in the order of the extensions', () => {
      project.write({
        'src/a/index.som': '',
        'src/a/index.js': '',
        'src/b/index.js': '',
        'src/c/index.json': '{}',
      });
      const r = resolver();
      expect(r.resolve('./a', from).resolvedPath).toBe(project.file('src/a/index.som'));
      expect(r.resolve('./b', from).resolvedPath).toBe(project.file('src/b/index.js'));
      expect(r.resolve('./c', from).resolvedPath).toBe(project.file('src/c/index.json'));
    });

    test('a directory with package.json uses its "main", else its index', () => {
      project.write({
        'src/withmain/package.json': '{ "main": "lib/entry" }',
        'src/withmain/lib/entry.som': '',
        'src/withmain/index.som': '',
        'src/maindir/package.json': '{ "main": "./lib" }',
        'src/maindir/lib/index.js': '',
        'src/nomain/package.json': '{ "name": "nomain" }',
        'src/nomain/index.som': '',
        'src/emptymain/package.json': '{ "main": "" }',
        'src/emptymain/index.js': '',
      });
      const r = resolver();
      expect(r.resolve('./withmain', from).resolvedPath).toBe(
        project.file('src/withmain/lib/entry.som')
      );
      expect(r.resolve('./maindir', from).resolvedPath).toBe(
        project.file('src/maindir/lib/index.js')
      );
      expect(r.resolve('./nomain', from).resolvedPath).toBe(project.file('src/nomain/index.som'));
      expect(r.resolve('./emptymain', from).resolvedPath).toBe(
        project.file('src/emptymain/index.js')
      );
    });

    test('"main" may not leave its directory, also not through a link', () => {
      project.write({
        'src/evil/package.json': '{ "main": "../../secret" }',
        'secret.som': '',
        'outside/o.som': '',
        'src/linked/package.json': '{ "main": "out/o" }',
      });
      linkDirectory(project.file('outside'), project.file('src/linked/out'));
      const r = resolver();
      expect(() => r.resolve('./evil', from)).toThrow(
        "package.json 'main' field escapes package directory: ../../secret"
      );
      expect(() => r.resolve('./linked', from)).toThrow(
        "package.json 'main' field escapes package directory: out/o"
      );
    });

    // Windows needs privileges for links to files
    (process.platform === 'win32' ? test.skip : test)(
      '"main" may not name a file that links outside its directory',
      () => {
        project.write({ 'outside/o.som': '', 'src/filelink/package.json': '{ "main": "entry" }' });
        fs.symlinkSync(project.file('outside/o.som'), project.file('src/filelink/entry.som'));
        expect(() => resolver().resolve('./filelink', from)).toThrow(
          "package.json 'main' field escapes package directory: entry"
        );
      }
    );

    test('a package.json that is no JSON object is an error that names it', () => {
      project.write({
        'src/broken/package.json': '{ "main": ',
        'src/list/package.json': '[]',
        'src/nothing/package.json': 'null',
      });
      const r = resolver();
      expect(() => r.resolve('./broken', from)).toThrow(
        `Invalid package.json ${project.file('src/broken/package.json')}: `
      );
      for (const dir of ['list', 'nothing']) {
        expect(() => r.resolve(`./${dir}`, from)).toThrow(
          `Invalid package.json ${project.file(`src/${dir}/package.json`)}: it must contain a JSON object`
        );
      }
    });

    test('a directory without an index file and a missing file are errors', () => {
      project.write({ 'src/empty/readme.md': '' });
      const r = resolver();
      expect(() => r.resolve('./empty', from)).toThrow(
        `Cannot resolve module: ${project.file('src/empty')}`
      );
      expect(() => r.resolve('../nothing', from)).toThrow(
        `Cannot resolve module: ${project.file('nothing')}`
      );
    });

    test('parent directories outside baseUrl are allowed', () => {
      project.write({ 'shared/s.som': '' });
      const r = new ModuleResolver({ baseUrl: project.file('src') });
      expect(r.resolve('../shared/s', from).resolvedPath).toBe(project.file('shared/s.som'));
    });

    test('fromFile may be a file, a directory, a file not on disk or a relative path', () => {
      project.write({ 'src/util.som': '', 'src/sub/util.som': '' });
      const r = resolver();
      const expected = project.file('src/util.som');
      expect(r.resolve('./util', from).resolvedPath).toBe(expected);
      expect(r.resolve('./util', project.file('src')).resolvedPath).toBe(expected);
      expect(r.resolve('./util', project.file('src/not-yet.som')).resolvedPath).toBe(expected);
      expect(r.resolve('./util', path.relative(process.cwd(), from)).resolvedPath).toBe(expected);
      // The directory itself, not its parent
      expect(r.resolve('./util', project.file('src/sub')).resolvedPath).toBe(
        project.file('src/sub/util.som')
      );
    });
  });

  describe('absolute specifiers', () => {
    test('a path inside baseUrl is a file path, resolved like a relative one', () => {
      project.write({ 'src/util.som': '', 'src/dir/index.som': '' });
      const r = resolver();
      expect(r.resolve(project.file('src/util.som'), from).resolvedPath).toBe(
        project.file('src/util.som')
      );
      expect(r.resolve(project.file('src/util'), from).resolvedPath).toBe(
        project.file('src/util.som')
      );
      expect(r.resolve(project.file('src/dir'), from).resolvedPath).toBe(
        project.file('src/dir/index.som')
      );
    });

    test('a system path outside baseUrl is a file path too', () => {
      project.write({ 'outside/o.som': '' });
      const r = new ModuleResolver({ baseUrl: project.file('src') });
      const outside = project.file('outside/o');
      if (isSystemPath(path.normalize(outside))) {
        expect(r.resolve(outside, from).resolvedPath).toBe(project.file('outside/o.som'));
      } else {
        // macOS: /private/var/… is no common system prefix, so it is project-relative
        expect(() => r.resolve(outside, from)).toThrow(/Cannot resolve module/);
      }
    });

    test('other absolute paths are relative to baseUrl and stay inside it', () => {
      project.write({ 'lib/utils/math.som': '', 'outside/o.som': '' });
      const r = new ModuleResolver({ baseUrl: project.root });
      expect(r.resolve('/lib/utils/math', from).resolvedPath).toBe(
        project.file('lib/utils/math.som')
      );
      const sandboxed = new ModuleResolver({ baseUrl: project.file('src') });
      expect(() => sandboxed.resolve('/../outside/o', from)).toThrow(
        `Module specifier '/../outside/o' resolves outside baseUrl '${project.file('src')}'. ` +
          'Project-relative absolute imports must stay inside the project tree.'
      );
      expect(() => sandboxed.resolve('/missing', from)).toThrow(
        `Cannot resolve module: ${project.file('src/missing')}`
      );
    });

    test('with the file system root as baseUrl every path is inside it', () => {
      const root = path.parse(project.root).root;
      const r = new ModuleResolver({ baseUrl: root });
      const missing = `/somon-resolver-missing-${process.pid}`;
      expect(() => r.resolve(missing, from)).toThrow(
        `Cannot resolve module: ${path.resolve(root, missing.slice(1))}`
      );
    });

    test('a link inside baseUrl cannot lead outside it', () => {
      project.write({ 'outside/o.som': '' });
      linkDirectory(project.file('outside'), project.file('src/out'));
      const r = new ModuleResolver({ baseUrl: project.file('src') });
      expect(() => r.resolve('/out/o', from)).toThrow(/resolves outside baseUrl/);
      // A relative import through the same link is allowed
      expect(r.resolve('./out/o', from).resolvedPath).toBe(project.file('src/out/o.som'));
    });
  });

  describe('paths mappings', () => {
    beforeEach(() => {
      project.write({
        'config/main.som': '',
        'src/app/view.som': '',
        'src/app/model/index.som': '',
        'vendor/thing.js': '',
        'outside-dir/x.som': '',
        'node_modules/plain/index.js': '',
      });
    });

    test('exact names, "prefix/*" patterns and "*" map to files under baseUrl', () => {
      const r = resolver({
        paths: {
          config: ['config/main'],
          '@app/*': ['missing/*', 'src/app/*'],
          '*': ['vendor/*'],
        },
      });
      expect(r.resolve('config', from).resolvedPath).toBe(project.file('config/main.som'));
      // The first mapping that resolves wins
      expect(r.resolve('@app/view', from).resolvedPath).toBe(project.file('src/app/view.som'));
      expect(r.resolve('@app/model', from).resolvedPath).toBe(
        project.file('src/app/model/index.som')
      );
      expect(r.resolve('thing', from)).toMatchObject({
        resolvedPath: project.file('vendor/thing.js'),
        isExternalLibrary: false,
      });
      // No mapping resolves: node_modules
      expect(r.resolve('plain', from)).toMatchObject({
        resolvedPath: project.file('node_modules/plain/index.js'),
        isExternalLibrary: true,
      });
    });

    test('a mapping may name baseUrl itself', () => {
      project.write({ 'index.som': '' });
      const r = resolver({ paths: { '~': ['.'] } });
      expect(r.resolve('~', from).resolvedPath).toBe(project.file('index.som'));
    });

    test('mappings that leave baseUrl are skipped, also through a link', () => {
      linkDirectory(project.file('outside-dir'), project.file('src/linked'));
      const r = new ModuleResolver({
        baseUrl: project.file('src'),
        paths: { 'esc/*': ['../outside-dir/*'], 'lnk/*': ['linked/*'] },
      });
      expect(() => r.resolve('esc/x', from)).toThrow('Module not found: esc/x');
      expect(() => r.resolve('lnk/x', from)).toThrow('Module not found: lnk/x');
    });
  });

  describe('packages', () => {
    test('main, index, files and subpaths of packages in node_modules', () => {
      project.write({
        'node_modules/withmain/package.json': '{ "main": "./dist/main.js" }',
        'node_modules/withmain/dist/main.js': '',
        'node_modules/withmain/extra.js': '',
        'node_modules/@scope/pkg/index.js': '',
        'node_modules/single.js': '',
      });
      const r = resolver();
      expect(r.resolve('withmain', from)).toEqual({
        resolvedPath: project.file('node_modules/withmain/dist/main.js'),
        isExternalLibrary: true,
        packageName: 'withmain',
        extension: '.js',
      });
      expect(r.resolve('withmain/extra', from).resolvedPath).toBe(
        project.file('node_modules/withmain/extra.js')
      );
      expect(r.resolve('@scope/pkg', from)).toMatchObject({
        resolvedPath: project.file('node_modules/@scope/pkg/index.js'),
        packageName: '@scope/pkg',
      });
      expect(r.resolve('single', from).resolvedPath).toBe(project.file('node_modules/single.js'));
    });

    test('the search climbs from the importing directory to the root', () => {
      project.write({ 'node_modules/top/index.js': '', 'src/deep/er/x.som': '' });
      const r = resolver();
      expect(r.resolve('top', project.file('src/deep/er/x.som')).resolvedPath).toBe(
        project.file('node_modules/top/index.js')
      );
    });

    test('moduleDirectories are searched in order in every directory', () => {
      project.write({
        'src/web_modules/both/index.js': '',
        'src/node_modules/both/index.js': '',
        'node_modules/only-node/index.js': '',
      });
      const r = resolver({ moduleDirectories: ['web_modules', 'node_modules'] });
      expect(r.resolve('both', from).resolvedPath).toBe(
        project.file('src/web_modules/both/index.js')
      );
      expect(r.resolve('only-node', from).resolvedPath).toBe(
        project.file('node_modules/only-node/index.js')
      );
      const webOnly = resolver({ moduleDirectories: ['web_modules'] });
      expect(() => webOnly.resolve('only-node', from)).toThrow('Module not found: only-node');
    });

    test("bare specifiers with '..' are rejected", () => {
      expect(() => resolver().resolve('pkg/../../x', from)).toThrow(
        "Bare module specifier 'pkg/../../x' must not contain '..' segments"
      );
      expect(() => resolver().resolve('..', from)).toThrow(/must not contain '\.\.' segments/);
    });

    describe('package.json "exports"', () => {
      const pkg = (name: string, exportsField: unknown, files: Record<string, string> = {}) => {
        project.write({
          [`node_modules/${name}/package.json`]: JSON.stringify({ name, exports: exportsField }),
          ...Object.fromEntries(
            Object.entries(files).map(([file, content]) => [
              `node_modules/${name}/${file}`,
              content,
            ])
          ),
        });
      };
      const resolvePkg = (spec: string) => resolver().resolve(spec, from).resolvedPath;
      const inPkg = (name: string, file: string) => project.file(`node_modules/${name}/${file}`);

      test('a string, "." and subpath keys', () => {
        pkg('str', './s.js', { 's.js': '' });
        pkg('dot', { '.': './d.js', './sub': './sub/s.js' }, { 'd.js': '', 'sub/s.js': '' });
        expect(resolvePkg('str')).toBe(inPkg('str', 's.js'));
        expect(resolvePkg('dot')).toBe(inPkg('dot', 'd.js'));
        expect(resolvePkg('dot/sub')).toBe(inPkg('dot', 'sub/s.js'));
      });

      test('patterns: the longest prefix wins, and a suffix is kept', () => {
        pkg(
          'pat',
          {
            './features/*': './lib/features/*.js',
            './features/internal/*': './lib/internal/*.js',
            './styles/*.css': './css/*.css',
          },
          { 'lib/features/a.js': '', 'lib/internal/b.js': '', 'css/main.css': '' }
        );
        expect(resolvePkg('pat/features/a')).toBe(inPkg('pat', 'lib/features/a.js'));
        expect(resolvePkg('pat/features/internal/b')).toBe(inPkg('pat', 'lib/internal/b.js'));
        expect(resolvePkg('pat/styles/main.css')).toBe(inPkg('pat', 'css/main.css'));
        expect(() => resolvePkg('pat/styles/main.less')).toThrow(/not exported/);
      });

      test('conditions require, node and default in their order; import only as a fallback', () => {
        pkg(
          'cond',
          {
            '.': { browser: './b.js', import: './i.mjs', node: './n.js', default: './d.js' },
            './req': { default: './d.js', require: './r.js' },
            './nested': { node: { import: './i.mjs', require: './r.js' } },
            './esm': { import: './i.mjs' },
          },
          { 'b.js': '', 'i.mjs': '', 'n.js': '', 'd.js': '', 'r.js': '' }
        );
        expect(resolvePkg('cond')).toBe(inPkg('cond', 'n.js'));
        expect(resolvePkg('cond/req')).toBe(inPkg('cond', 'd.js'));
        expect(resolvePkg('cond/nested')).toBe(inPkg('cond', 'r.js'));
        expect(resolvePkg('cond/esm')).toBe(inPkg('cond', 'i.mjs'));
      });

      test('arrays: the first target that matches', () => {
        pkg(
          'arr',
          { '.': [{ worker: './w.js' }, './main.js'], './none': [{ worker: './w.js' }] },
          { 'w.js': '', 'main.js': '' }
        );
        expect(resolvePkg('arr')).toBe(inPkg('arr', 'main.js'));
        expect(() => resolvePkg('arr/none')).toThrow(
          `Package subpath './none' is not exported by ${inPkg('arr', 'package.json')} (importing 'arr/none')`
        );
      });

      test('without "exports" (also null) main and the files are used', () => {
        project.write({
          'node_modules/nul/package.json': '{ "exports": null, "main": "m.js" }',
          'node_modules/nul/m.js': '',
          'node_modules/nul/other.js': '',
        });
        expect(resolvePkg('nul')).toBe(inPkg('nul', 'm.js'));
        expect(resolvePkg('nul/other')).toBe(inPkg('nul', 'other.js'));
      });

      test('what is not exported, escapes the package or is missing is an error', () => {
        pkg('top', { require: './r.js' }, { 'r.js': '' });
        pkg('bad', { '.': 'r.js', './up': './../outside.js', './gone': './gone.js' });
        project.write({ 'node_modules/outside.js': '' });
        expect(resolvePkg('top')).toBe(inPkg('top', 'r.js'));
        expect(() => resolvePkg('top/sub')).toThrow(/Package subpath '\.\/sub' is not exported/);
        // Targets must start with './'
        expect(() => resolvePkg('bad')).toThrow(/Package subpath '\.' is not exported/);
        expect(() => resolvePkg('bad/up')).toThrow(
          "package.json 'exports' target escapes package directory: ./../outside.js"
        );
        expect(() => resolvePkg('bad/gone')).toThrow(
          `Cannot resolve module: ${inPkg('bad', 'gone.js')} (exported by ${inPkg('bad', 'package.json')})`
        );
      });
    });
  });

  describe('symlinks and paths that do not exist', () => {
    test('the containment check works for paths whose directories are missing', () => {
      // Nothing of '/missing/…' exists: the check compares resolved paths
      const r = new ModuleResolver({ baseUrl: project.file('src') });
      expect(() => r.resolve('/not/there', from)).toThrow(
        `Cannot resolve module: ${project.file('src/not/there')}`
      );
    });

    test('without realpath (a drive that does not exist) paths are compared as they are', () => {
      project.write({ 'lib/x.som': '' });
      const realpath = jest.spyOn(fs.realpathSync, 'native').mockImplementation(() => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });
      const r = resolver();
      expect(r.resolve('/lib/x', from).resolvedPath).toBe(project.file('lib/x.som'));
      expect(() => r.resolve('/../x', from)).toThrow(/resolves outside baseUrl/);
      expect(realpath).toHaveBeenCalled();
    });
  });

  describe('isSystemPath', () => {
    test.each([
      ['/home/user/x', true],
      ['/Users/me/x', true],
      ['/var/lib/x', true],
      ['/tmp/x', true],
      ['/opt/x', true],
      ['/usr/lib/x', true],
      ['/etc/x', true],
      ['D:\\work\\x.som', true],
      ['z:/x', true],
      ['\\\\fileserver\\share\\x', true],
      ['//fileserver/share/x', true],
      ['/lib/utils', false],
      ['/home', false],
      ['\\lib\\utils', false],
      ['C:relative', false],
      ['\\\\fileserver', false],
    ])('%s → %s', (candidate, expected) => {
      expect(isSystemPath(candidate)).toBe(expected);
    });
  });
});
