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

| Tajik                   | JavaScript             |
| ----------------------- | ---------------------- |
| `Ваъда.ҳама()`          | `Promise.all()`        |
| `Ваъда.ҳамаҲалшуда()`   | `Promise.allSettled()` |
| `Ваъда.ҳама гонаҷамъ()` | `Promise.any()`        |
| `Ваъда.мусобиқа()`      | `Promise.race()`       |
| `Ваъда.рад()`           | `Promise.reject()`     |
| `Ваъда.ҳал()`           | `Promise.resolve()`    |

## Promise Instance Methods

```som
тағ ваъда = fetch(url);
ваъда.гирифтан(хато => чоп.хато(хато));
ваъда.ниҳоят(() => чоп.сабт("Анҷом"));
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
