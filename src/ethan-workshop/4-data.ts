import { Either, Option } from "effect";

const none = Option.none();
const some = Option.some("hello");

// console.log(none);
// console.log(some);

if (Option.isSome(some)) {
  //   console.log(some.value);
}

// console.log(Option.map(Option.none(), (value) => value + 1));

const rightValue = Either.right(42);
const leftValue = Either.left("not a number");
console.log(rightValue);
console.log(leftValue);
const rightResult = Either.map(rightValue, (n) => n + 1);
console.log(rightResult);
const leftResult = Either.map(leftValue, (n) => n.toUpperCase());
console.log(leftResult);
