// String enums in switch statements and maps
enum Level {
  Debug = 'debug',
  Info = 'info',
  Error = 'error',
}

const weights: Record<Level, number> = {
  [Level.Debug]: 0,
  [Level.Info]: 1,
  [Level.Error]: 2,
};

function shouldLog(level: Level, minimum: Level): boolean {
  return weights[level] >= weights[minimum];
}

function icon(level: Level): string {
  switch (level) {
    case Level.Debug:
      return '.';
    case Level.Info:
      return 'i';
    case Level.Error:
      return '!';
    default:
      return '?';
  }
}

for (const level of [Level.Debug, Level.Info, Level.Error]) {
  console.log(level, icon(level), shouldLog(level, Level.Info));
}
