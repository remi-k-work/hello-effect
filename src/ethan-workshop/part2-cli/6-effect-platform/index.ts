import { Console, Effect, Layer, Option, pipe } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";

import { CLIOptions, Fetch } from "./model.js";

const AppLayer = Layer.mergeAll(CLIOptions.Default, Fetch.Default, NodeContext.layer);

function main() {
  return Effect.gen(function* () {
    const { url, method, data, headers, output, include } = yield* CLIOptions;
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
    yield* Option.match(output, {
      onNone: () => Console.log(finalString),
      onSome: (path) => fs.writeFileString(path, finalString),
    });
  }).pipe(Effect.scoped);
}

pipe(main(), Effect.provide(AppLayer), NodeRuntime.runMain);
