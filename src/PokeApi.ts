import { Config, Context, Effect, Schema, type ParseResult } from "effect";
import { FetchError, JsonError } from "./errors.js";
import { Pokemon } from "./schemas.js";

import type { ConfigError } from "effect/ConfigError";

interface PokeApiImpl {
  readonly getPokemon: Effect.Effect<Pokemon, FetchError | JsonError | ParseResult.ParseError | ConfigError>;
}

export class PokeApi extends Context.Tag("PokeApi")<PokeApi, PokeApiImpl>() {
  static readonly Live = PokeApi.of({
    getPokemon: Effect.gen(function* () {
      const baseUrl = yield* Config.string("BASE_URL");

      const response = yield* Effect.tryPromise({
        try: () => fetch(`${baseUrl}/api/v2/pokemon/garchomp/`),
        catch: () => new FetchError(),
      });

      if (!response.ok) {
        return yield* new FetchError();
      }

      const json = yield* Effect.tryPromise({
        try: () => response.json(),
        catch: () => new JsonError(),
      });

      return yield* Schema.decodeUnknown(Pokemon)(json);
    }),
  });
}
