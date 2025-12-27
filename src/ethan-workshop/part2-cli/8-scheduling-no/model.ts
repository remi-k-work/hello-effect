import { Context, Data, Effect, Match, Option, pipe, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform";

import { getCliOption, getCliOptionMultiple } from "./helpers.js";
import { StringPairsFromStrings } from "./schemas.js";

export class HeaderParseError extends Data.TaggedError("HeaderParseError")<{ readonly error: unknown }> {}
export class CliOptionsParseError extends Data.TaggedError("CliOptionsParseError")<{ readonly error: unknown }> {}

export class Fetch extends Effect.Service<Fetch>()("Fetch", {
  dependencies: [FetchHttpClient.layer],

  effect: Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;

    return {
      getResponse: (
        url: string,
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
        headers: readonly (readonly [string, string])[],
        data: Option.Option<string>,
      ) =>
        Effect.gen(function* () {
          // Resolve the HTTP method function
          const verb = yield* Match.value(method.toUpperCase()).pipe(
            Match.when("GET", () => HttpClientRequest.get),
            Match.when("POST", () => HttpClientRequest.post),
            Match.when("PUT", () => HttpClientRequest.put),
            Match.when("PATCH", () => HttpClientRequest.patch),
            Match.when("DELETE", () => HttpClientRequest.del),
            Match.option,
          );

          // Build the request object
          const req = verb(url).pipe(
            HttpClientRequest.setHeaders(headers),
            Option.match(data, {
              onNone: () => (req) => req,
              onSome: (content) => HttpClientRequest.bodyText(content),
            }),
          );

          // Execute using the client
          return yield* client.execute(req);
        }),
    };
  }),
}) {}

export class CLIOptions extends Effect.Service<CLIOptions>()("CLIOptions", {
  effect: Effect.gen(function* () {
    const args = yield* Effect.sync(() => process.argv);

    const method = getCliOption(args, { name: "method", alias: "X" }).pipe(Option.getOrElse(() => "GET" as const)) as
      | "GET"
      | "POST"
      | "PUT"
      | "PATCH"
      | "DELETE";
    const data = getCliOption(args, { name: "data", alias: "d" });
    const headers = yield* pipe(
      getCliOptionMultiple(args, { name: "headers", alias: "H" }),
      Schema.decode(StringPairsFromStrings),
      // Keep as tuple array to match CLIOptionsType
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

interface CLIOptionsType {
  readonly url: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly data: Option.Option<string>;
  readonly headers: readonly (readonly [string, string])[];
  readonly output: Option.Option<string>;
  readonly include: Option.Option<boolean>;
}

export class CLIOptions2 extends Effect.Service<CLIOptions2>()("CLIOptions2", {
  succeed: {
    url: "https://api.example.com",
    method: "GET",
    data: Option.none(),
    headers: [],
    output: Option.none(),
    include: Option.none(),
  } satisfies CLIOptionsType,
}) {}

export class CLIOptions3 extends Context.Tag("CLIOptions3")<
  CLIOptions3,
  {
    readonly url: string;
    readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    readonly data: Option.Option<string>;
    readonly headers: readonly (readonly [string, string])[];
    readonly output: Option.Option<string>;
    readonly include: Option.Option<boolean>;
  }
>() {}
