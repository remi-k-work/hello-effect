import fs, { type FileHandle } from "node:fs/promises";
import { Console, Effect, Exit, pipe, Scope } from "effect";

const one = Effect.gen(function* () {
  const scope = yield* Scope.make();
  yield* Scope.addFinalizer(scope, Console.log("Finalizer 1"));
  yield* Scope.addFinalizer(scope, Console.log("Finalizer 2"));
  yield* Scope.close(scope, Exit.succeed("scope closed"));
});

// Effect.runSync(one);

const two = Effect.gen(function* () {
  yield* Effect.addFinalizer(() => Console.log("Last!"));
  yield* Console.log("First");
});

const three = Effect.scoped(two);
// Effect.runSync(three);

const four = Effect.gen(function* () {
  yield* pipe(
    Effect.addFinalizer(() => Console.log("Last!")),
    Effect.scoped,
  );
  yield* Console.log("First");
});

// Effect.runSync(four);

const acquire = Effect.tryPromise({
  try: () => fs.open("src/ethan-workshop/2-context.ts", "r"),
  catch: (error) => new Error("Failed to open file", { cause: error }),
}).pipe(Effect.zipLeft(Console.log("File opened")));

const release = (file: FileHandle) => Effect.promise(() => file.close()).pipe(Effect.zipLeft(Console.log("File closed")));

const file = Effect.acquireRelease(acquire, release);
const useFile = (file: FileHandle) => Console.log(`Using File: ${file.fd}`);

const progam = file.pipe(Effect.flatMap(useFile), Effect.scoped);
// Effect.runPromise(progam);

const program2 = Effect.acquireUseRelease(acquire, useFile, release);
// await Effect.runPromise(program2);

const program3 = Effect.gen(function* () {
  const handle = yield* file;
  yield* Console.log("Using file");
  yield* pipe(
    Effect.tryPromise(() => handle.readFile()),
    Effect.andThen((buf) => Console.log(buf.toString())),
  );
}).pipe(Effect.scoped); // scope closed after all usages are finished- ok!

// await Effect.runPromise(program3);

// ***

class MockFile {
  public readonly fd: number;
  public close = Effect.suspend(() => Console.log(`close ${this.fd}`));

  constructor(fd: number) {
    this.fd = fd;
  }

  static readonly open = (fd: number) =>
    pipe(
      Console.log(`open ${fd}`),
      Effect.andThen(() => new MockFile(fd)),
    );
}

const file2 = (fd: number) => Effect.acquireRelease(MockFile.open(fd), (file) => file.close);
// await Effect.runPromise(program4);

const program5 = Effect.gen(function* () {
  const fileA = yield* file2(1);
  const fileB = yield* file2(2);
});

await Effect.runPromise(program5.pipe(Effect.scoped));
