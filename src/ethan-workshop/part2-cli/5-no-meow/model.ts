import { Data, Effect, Option, pipe, Schema } from "effect";
import { getCliOption, getCliOptionMultiple } from "./helpers.js";
import { StringPairsFromStrings } from "./schemas.js";

export class UnknownError extends Data.TaggedError("UnknownError")<{ readonly error: unknown }> {}
export class TextDecodeError extends Data.TaggedError("TextDecodeError") {}
export class HeaderParseError extends Data.TaggedError("HeaderParseError")<{ readonly error: unknown }> {}
export class CliOptionsParseError extends Data.TaggedError("CliOptionsParseError")<{ readonly error: unknown }> {}

export class Fetch extends Effect.Service<Fetch>()("Fetch", {
  succeed: globalThis.fetch,
}) {}

export class CLIOptions extends Effect.Service<CLIOptions>()("CLIOptions", {
  effect: Effect.gen(function* () {
    const args = yield* Effect.sync(() => process.argv);

    const method = getCliOption(args, { name: "method", alias: "X" }).pipe(Option.getOrElse(() => "GET"));
    const data = getCliOption(args, { name: "data", alias: "d" }).pipe(Option.getOrUndefined);
    const headers = yield* pipe(
      getCliOptionMultiple(args, { name: "headers", alias: "H" }),
      Schema.decode(StringPairsFromStrings),
      Effect.map((_) => Object.fromEntries(_)),
      Effect.mapError((error) => new HeaderParseError({ error })),
    );
    const output = getCliOption(args, { name: "output", alias: "O" });
    const include = getCliOption(args, { name: "include", alias: "i" }).pipe(
      Option.flatMap((_) => (["true", "false"].includes(_) ? Option.some(_) : Option.none())),
      Option.map((_) => _ === "true"),
    );

    const url = yield* Option.fromNullable(args[2]).pipe(Effect.mapError(() => new CliOptionsParseError({ error: "No url provided" })));

    return { url, method, data, headers, output, include } as const;
  }),
}) {}
