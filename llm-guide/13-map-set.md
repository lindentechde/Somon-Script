# Map and Set

`Map` and `Set` keep their JavaScript names; type them with generics:
`нав Map<сатр, рақам>()`, `нав Set<рақам>()`, `Map<К, В>`, `Set<Т>`.

## Member Aliases

| Tajik           | JavaScript  | On       |
| --------------- | ----------- | -------- |
| `гузоштан()`    | `set()`     | Map      |
| `бозгирифтан()` | `get()`     | Map      |
| `дорадКалид()`  | `has()`     | Map, Set |
| `нобудКардан()` | `delete()`  | Map, Set |
| `ҳаҷм`          | `size`      | Map, Set |
| `калидҳо()`     | `keys()`    | Map, Set |
| `қиматҳо()`     | `values()`  | Map, Set |
| `воридот()`     | `entries()` | Map, Set |
| `бароиҲар()`    | `forEach()` | Map, Set |

`add()` and `clear()` have no alias and keep their English names.

## `дорад` Is Not `has`

`дорад` always means `includes()`, which arrays and strings have but `Map` and
`Set` don't. Test membership with `дорадКалид`:

```som
собит дидашуда = нав Set<рақам>();
дидашуда.add(5);
чоп.сабт(дидашуда.дорадКалид(5));   // true — Set.has
чоп.сабт([1, 2].дорад(2));          // true — Array.includes
```

The type checker reports `дидашуда.дорад(5)` on a `Set` (an error with
`--strict`, otherwise a warning) and suggests `дорадКалид`.

## `бозгирифтан` May Return `беқимат`

`Map.get()` returns `беқимат` for a missing key, so with `--strict` its result
has type `В | беқимат`. Check it or give a default:

```som
собит синну = нав Map<сатр, рақам>();
синну.гузоштан("Алӣ", 30);

собит а = синну.бозгирифтан("Алӣ");
агар (а !== беқимат) {
    чоп.сабт(а + 1);
}
собит б = синну.бозгирифтан("Вали") ?? 0;
```

## Iterating

```som
собит нархҳо = нав Map<сатр, рақам>();
нархҳо.гузоштан("нон", 3);
барои (собит [ном, нарх] аз нархҳо) {
    чоп.сабт(ном, нарх);
}
```
