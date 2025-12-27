import { Console, Effect, Layer, Option, pipe, Schema } from "effect";
import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";

import { CLIOptions3, Fetch } from "./model.js";
import { StringPairsFromStrings } from "./schemas.js";

const AppLayer = Layer.mergeAll(Fetch.Default, NodeContext.layer);

function main() {
  return Effect.gen(function* () {
    const { url, method, data, headers, output, include } = yield* CLIOptions3;
    const { getResponse } = yield* Fetch;

    const res = yield* getResponse(url, method, headers, data);

    const buffer: string[] = [];

    if (Option.isSome(include)) {
      buffer.push(`${res.status}`);
      for (const [key, value] of Object.entries(res.headers)) {
        buffer.push(`${key}: ${value}`);
      }
      // Add an empty line to separate headers from body
      buffer.push("");
    }

    const text = yield* res.text;
    buffer.push(text);

    const finalString = buffer.join("\n");

    const fs = yield* FileSystem.FileSystem;
    yield* Effect.matchEffect(output, {
      onSuccess: (output) => fs.writeFileString(output, finalString),
      onFailure: () => Console.log(finalString),
    });
  }).pipe(Effect.scoped);
}

const urlArg = Args.text({ name: "url" }).pipe(Args.withDescription("The URL to send the request to"));
const methodOption = Options.text("method").pipe(
  Options.withAlias("X"),
  Options.withDescription("The HTTP method to use"),
  Options.withSchema(Schema.Literal("GET", "POST", "PUT", "PATCH", "DELETE")),
  Options.withDefault("GET"),
);
const dataOption = Options.text("data").pipe(Options.withAlias("d"), Options.withDescription("The body of the request"), Options.optional);
const headersOption = Options.text("header").pipe(
  Options.withAlias("H"),
  Options.withDescription("The headers to send with the request"),
  Options.repeated,
  Options.map((_) => _ as ReadonlyArray<string>),
  Options.withSchema(StringPairsFromStrings),
);
const outputOption = Options.file("output").pipe(Options.withAlias("o"), Options.withDescription("The file to write the response to"), Options.optional);
const includeOption = Options.boolean("include").pipe(
  Options.withAlias("i"),
  Options.withDescription("Include the response headers in the output"),
  Options.optional,
);

const cli = pipe(
  Command.make("root", { url: urlArg, method: methodOption, data: dataOption, headers: headersOption, output: outputOption, include: includeOption }),
  Command.withHandler(main),
  Command.provideSync(CLIOptions3, (_) => _),
  Command.run({
    name: "bend",
    version: "1.0.0",
  }),
  (run) => Effect.suspend(() => run(process.argv)),
);

pipe(cli, Effect.provide(AppLayer), NodeRuntime.runMain);
