import { Context, Effect, Layer } from "effect";

const dateNow = Effect.sync(() => new Date()).pipe(Effect.map((date) => date.toTimeString()));

class Foo extends Context.Tag("Foo")<Foo, { readonly bar: string }>() {
  static readonly Live = Layer.succeed(Foo, { bar: "imFromContext!" });
}

const test1 = Effect.gen(function* () {
  const context = yield* Effect.context<Foo>();
  const foo = Context.get(context, Foo);
  return foo.bar;
}).pipe(Effect.provide(Foo.Live));

Effect.runPromise(test1).then(console.log);

class Random extends Context.Tag("Random")<
  Random,
  {
    readonly nextInt: Effect.Effect<number>;
    readonly nextBool: Effect.Effect<boolean>;
    readonly nextIntBetween: (min: number, max: number) => Effect.Effect<number>;
  }
>() {
  static readonly Mock = Layer.succeed(Random, {
    nextInt: Effect.succeed(42),
    nextBool: Effect.succeed(true),
    nextIntBetween: (min, max) => Effect.succeed(min + max),
  });
}

const test2 = Effect.gen(function* () {
  const random = yield* Random;
  return {
    nextInt: yield* random.nextInt,
    nextBool: yield* random.nextBool,
    nextIntBetween: yield* random.nextIntBetween(10, 20),
  };
}).pipe(Effect.provide(Random.Mock));

Effect.runPromise(test2).then(console.log);

const { nextInt, nextBool } = Effect.serviceConstants(Random);
const { nextIntBetween } = Effect.serviceFunctions(Random);

// Building up programs
const foo = Effect.succeed(5);
const seven = Effect.andThen(foo, "hi!");
const zippedRight = Effect.zipRight(Effect.succeed("hi"), Effect.succeed(10));
