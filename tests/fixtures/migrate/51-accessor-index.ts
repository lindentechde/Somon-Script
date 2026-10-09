// Auto-accessors and class index signatures
class Settings {
  [key: string]: unknown;
  accessor theme = 'dark';
  static accessor instances = 0;
  constructor() {
    Settings.instances++;
  }
}

const settings = new Settings();
settings.theme = 'light';
settings['custom'] = 42;
new Settings();
console.log(settings.theme, settings['custom'], Settings.instances);
