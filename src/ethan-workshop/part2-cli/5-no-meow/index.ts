import * as fs from "node:fs/promises";
import { Console, Effect, Exit, Layer } from "effect";
import { CLIOptions, Fetch, TextDecodeError, UnknownError } from "./model.js";

const MainLayer = Layer.mergeAll(CLIOptions.Default, Fetch.Default);

function main() {
  return Effect.gen(function* () {
    const { url, method, data, headers, output, include } = yield* CLIOptions;

    const res = yield* getResponse(url, method, headers, data);

    const buffer: string[] = [];

    if (include) {
      buffer.push(`${res.status} ${res.statusText}`);
      res.headers.forEach((value, key) => {
        buffer.push(`${key}: ${value}`);
      });
      // Add an empty line to separate headers from body
      buffer.push("");
    }

    const text = yield* getText(res);
    buffer.push(text);

    const finalString = buffer.join("\n");
    yield* Effect.matchEffect(output, {
      onSuccess: (output) => Effect.tryPromise(() => fs.writeFile(output, finalString)),
      onFailure: () => Console.log(finalString),
    });
  });
}

const exit = main().pipe(
  Effect.provide(MainLayer),
  Effect.catchTags({
    TextDecodeError: (error) => Console.error("Text decode error: ", error),
    UnknownError: (error) => Console.error("Unknown error: ", error),
  }),
  Effect.runPromiseExit,
);

Exit.match(await exit, {
  onSuccess: () => process.exit(0),
  onFailure: (cause) => {
    console.error(cause);
    process.exit(1);
  },
});

// ***
function getResponse(url: string, method: string, headers: object, data?: string) {
  return Effect.gen(function* () {
    const providedFetch = yield* Fetch;

    return yield* Effect.tryPromise({
      try: (signal) =>
        providedFetch(url, {
          method,
          headers,
          ...(data && { body: data }),
          signal,
        }),
      catch: (error) => new UnknownError({ error }),
    });
  });
}

function getText(res: Response) {
  return Effect.tryPromise({ try: () => res.text(), catch: () => new TextDecodeError() });
}
// ***
