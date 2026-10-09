// keyof, typeof, indexed access, mapped, conditional and template literal types
const config = { host: 'localhost', port: 8080, secure: false };
type Config = typeof config;
type ConfigKey = keyof Config;
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type Optional<T> = { [K in keyof T]?: T[K] };
type Mutable<T> = { -readonly [K in keyof T]-?: T[K] };
type ElementType<T> = T extends (infer U)[] ? U : T;
type IsString<T> = T extends string ? 'yes' : 'no';

function getter<K extends ConfigKey>(key: K): () => Config[K] {
  return () => config[key];
}

const getters = {} as Getters<Config>;
getters.getHost = getter('host');
const partial: Optional<Config> = { port: 1 };
const mutable: Mutable<Readonly<Config>> = { ...config };
mutable.port = 9090;
const element: ElementType<number[]> = 5;
const answer: IsString<'x'> = 'yes';
const keys: ConfigKey[] = ['host', 'port'];

console.log(getters.getHost(), partial.port, mutable.port, element, answer, keys.join(','));
