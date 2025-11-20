import { compile } from './src/compiler';

const source = 'тағйирёбанда ҳисоб = (а: рақам, б: рақам): рақам => а * б;';
try {
  const result = compile(source);
  console.log('Code:', result.code);
  console.log('Errors:', result.errors);
} catch (e) {
  console.error('Exception:', e);
}
