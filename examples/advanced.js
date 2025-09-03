import { ҷамъ_кардан, тақсим_кардан } from "./math.som";
import пешфарз_функсия from "./utils.som";
let рақамҳо = [1, 2, 3, 4, 5];
console.log("Дарозии рӯйхат:", рақамҳо.length);
function дубарабар_кардан(рақам) {
  return рақам * 2;
}
function ҷуфт_аст(рақам) {
  return (рақам % 2 == 0);
}
console.log("Мисоли функсияҳо:");
console.log("Дубарабар аз 3:", дубарабар_кардан(3));
console.log("5 ҷуфт аст?", ҷуфт_аст(5));
let матн = "Салом, ҷаҳони барномасозӣ!";
console.log("Дарозии матн:", матн.length);
let калимаҳо = матн.split(" ");
console.log("Калимаҳо:", калимаҳо);
async function маълумот_гирифтан() {
  try {
  let натиҷа = await пешфарз_функсия();
    console.log("Натиҷа гирифта шуд:", натиҷа);
  } catch (Error) {
  console.error("Хато рӯй дод:", Error);
  } finally {
  console.info("Амалиёт тамом шуд");
  }
}
export function ҳисоб_кардан(а, б, амал) {
  if (амал == "ҷамъ") {
  return ҷамъ_кардан(а, б);
  } else if (амал == "тақсим") {
  return тақсим_кардан(а, б);
  } else {
  throw new Error("Амали номаълум: " + амал);
  }
}
export default ҳисоб_кардан;