import { Data, Effect, Option } from "effect";
import meow from "meow";

export class UnknownError extends Data.TaggedError("UnknownError")<{ readonly error: unknown }> {}
export class TextDecodeError extends Data.TaggedError("TextDecodeError") {}
export class HeaderParseError extends Data.TaggedError("HeaderParseError") {}
export class CliOptionsParseError extends Data.TaggedError("CliOptionsParseError")<{ readonly error: unknown }> {}

export class Fetch extends Effect.Service<Fetch>()("Fetch", {
  succeed: globalThis.fetch,
}) {}

export class CLIOptions extends Effect.Service<CLIOptions>()("CLIOptions", {
  effect: Effect.gen(function* () {
    const cli = yield* Effect.try({
      try: () => parseCliOptions(),
      catch: (error) => new CliOptionsParseError({ error }),
    });

    const arg = yield* Option.fromNullable(cli.input[0]).pipe(Effect.mapError(() => new CliOptionsParseError({ error: "No url provided" })));

    return { url: arg, ...cli.flags } as const;
  }),
}) {}

// ***
function parseCliOptions() {
  return meow(
    `
	Usage
	  $ bend [...options] <url>

	Options
	  --method, -X  The HTTP method to use
      --header, -H  The HTTP headers to use
      --data,   -d  The data to send
      --output, -o  The output file
      --include, -i Include the HTTP headers in the output
`,
    {
      importMeta: import.meta,
      flags: {
        method: {
          type: "string",
          shortFlag: "X",
          default: "GET",
          isRequired: false,
        },
        headers: {
          type: "string",
          shortFlag: "H",
          isMultiple: true,
          isRequired: false,
        },
        data: {
          type: "string",
          shortFlag: "d",
          isRequired: false,
        },
        output: {
          type: "string",
          shortFlag: "o",
          isRequired: false,
        },
        include: {
          type: "boolean",
          shortFlag: "i",
          isRequired: false,
        },
      },
    },
  );
}
