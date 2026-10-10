import { createProgram } from '../src/cli/program';
import { i18n } from '../src/cli/i18n';

const startLanguageServer = jest.fn();
jest.mock('../src/lsp', () => ({ startLanguageServer }));

describe('somon lsp (command)', () => {
  afterEach(() => {
    startLanguageServer.mockReset();
    i18n.setLanguage('en');
  });

  test('is registered with --stdio and described in every language', () => {
    for (const language of ['en', 'ru', 'tj'] as const) {
      i18n.setLanguage(language);
      const command = createProgram().commands.find(candidate => candidate.name() === 'lsp')!;
      expect(command.description()).toContain('Language Server Protocol');
      expect(command.options.map(option => option.long)).toContain('--stdio');
    }
  });

  test('starts the server in the CLI language, accepting client flags', async () => {
    i18n.setLanguage('tj');
    await createProgram().parseAsync(['node', 'somon', 'lsp', '--stdio', '--clientProcessId=42']);
    expect(startLanguageServer).toHaveBeenCalledWith({
      locale: 'tj',
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
    });
  });
});
