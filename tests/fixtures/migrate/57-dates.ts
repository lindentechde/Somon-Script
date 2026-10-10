// Dates with fixed values
const epoch = new Date(0);
console.log(epoch.toISOString(), epoch.getTime());
const date = new Date(Date.UTC(2024, 1, 29, 12, 30));
console.log(date.toISOString(), date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
const later = new Date(date.getTime() + 24 * 60 * 60 * 1000);
console.log(later.toISOString().slice(0, 10), later > date);
console.log(JSON.stringify({ when: epoch }));
