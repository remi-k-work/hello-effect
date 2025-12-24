import * as fs from "node:fs/promises";
import { Console, Effect, Exit, Layer, Option } from "effect";
import { CLIOptions, Fetch, HeaderParseError, TextDecodeError, UnknownError } from "./model.js";

const MainLayer = Layer.mergeAll(CLIOptions.Default, Fetch.Default);

function main() {
  return Effect.gen(function* () {
    const options = yield* CLIOptions;

    const headers = yield* getHeaders2(options);
    const res = yield* getResponse(options.url, options, headers);

    const buffer: string[] = [];

    if (options?.include) {
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
    yield* Effect.matchEffect(Option.fromNullable(options?.output), {
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
function getHeaders(options?: CLIOptions) {
  return options?.headers?.reduce((acc, header) => {
    const [key, value] = header.split(":");
    if (!key || !value) throw new Error("Invalid header");
    acc.push([key, value]);
    return acc;
  }, new Array<[string, string]>());
}

function getHeaders2(options?: CLIOptions) {
  // Wrap the potential null/undefined headers in an Option
  return Option.fromNullable(options?.headers).pipe(
    // If it's None, provide an empty array so the rest of the chain works
    Option.getOrElse(() => []),
    // Now we have a standard string[], convert the reduction logic to an Effect
    (headerArray) =>
      Effect.reduce(headerArray, new Array<[string, string]>(), (acc, header) => {
        const [key, value] = header.split(":");
        if (!key || !value) return Effect.fail(new HeaderParseError());
        return Effect.succeed([...acc, [key.trim(), value.trim()]]);
      }),
  );
}

function getResponse(url: string, options?: CLIOptions, headers?: Array<[string, string]>) {
  return Effect.gen(function* () {
    const providedFetch = yield* Fetch;

    return yield* Effect.tryPromise({
      try: (signal) =>
        providedFetch(url, {
          ...(options?.method && { method: options.method }),
          ...(options?.data && { body: options.data }),
          ...(headers && { headers }),
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
