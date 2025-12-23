import * as fs from "node:fs/promises";
import meow from "meow";
import { Console, Effect, Option } from "effect";
import { HeaderParseError, TextDecodeError, UnknownError } from "./model.js";

const cli = meow(
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
const arg = cli.input[0];
if (!arg) {
  console.error("No url provided");
  process.exit(1);
}

try {
  await Effect.runPromise(main(arg, cli.flags));
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  process.exit(0);
}

interface CLIOptions {
  method: string;
  data: string | undefined;
  headers: string[] | undefined;
  output: string | undefined;
  include: boolean | undefined;
}

function main(url: string, options?: CLIOptions) {
  return Effect.gen(function* () {
    const headers = yield* getHeaders2(options);
    const res = yield* getResponse(url, options, headers);

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
  return Effect.tryPromise({
    try: (signal) =>
      fetch(url, {
        ...(options?.method && { method: options.method }),
        ...(options?.data && { body: options.data }),
        ...(headers && { headers }),
        signal,
      }),
    catch: (error) => new UnknownError({ error }),
  });
}

function getText(res: Response) {
  return Effect.tryPromise({ try: () => res.text(), catch: (error) => new TextDecodeError() });
}
// ***
