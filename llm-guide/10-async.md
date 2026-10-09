# Async/Await & Promises

## Async Functions

```som
ҳамзамон функсия маълумотГирифтан(url: сатр): Ваъда<сатр> {
    тағ ҷавоб = интизор fetch(url);
    тағ матн = интизор ҷавоб.text();
    бозгашт матн;
}
// async function fetchData(url: string): Promise<string> {
//     let response = await fetch(url);
//     let text = await response.text();
//     return text;
// }
```

## Promise Methods

There are no Tajik aliases for the static Promise methods. Use the JavaScript
names on `Promise` directly (`Promise.all()`, `Promise.allSettled()`,
`Promise.any()`, `Promise.race()`, `Promise.reject()`, `Promise.resolve()`).
Note that `ҳама` is the array `every` alias, so `Ваъда.ҳама()` does **not** mean
`Promise.all()`.

## Promise Instance Methods

```som
тағ амал = fetch(url);
амал.гирифтан(хато => чоп.хато(хато));
амал.ниҳоят(() => чоп.сабт("Анҷом"));
// promise.catch(error => console.error(error));
// promise.finally(() => console.log("Done"));
```

## Async Error Handling

```som
ҳамзамон функсия loadData() {
    кӯшиш {
        тағ data = интизор fetch(url);
        бозгашт data;
    } гирифтан (хато) {
        чоп.хато("Хатогӣ:", хато);
        партофтан хато;
    }
}
```

## Keywords

| Tajik      | JavaScript            |
| ---------- | --------------------- |
| `ҳамзамон` | `async`               |
| `интизор`  | `await`               |
| `Ваъда`    | `Promise`             |
| `ваъда`    | `Promise` (lowercase) |
