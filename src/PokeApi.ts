import { Effect, Schema } from "effect";
import { FetchError, JsonError } from "./errors.js";
import { Pokemon } from "./schemas.js";

import { PokemonCollection } from "./PokemonCollection.js";
import { BuildPokeApiUrl } from "./BuildPokeApiUrl.js";

export class PokeApi extends Effect.Service<PokeApi>()("PokeApi", {
  effect: Effect.gen(function* () {
    const pokemonCollection = yield* PokemonCollection;
    const buildPokeApiUrl = yield* BuildPokeApiUrl;

    return {
      getPokemon: Effect.gen(function* () {
        const requestUrl = buildPokeApiUrl(yield* Effect.fromNullable(pokemonCollection[0]));

        const response = yield* Effect.tryPromise({
          try: () => fetch(requestUrl),
          catch: () => new FetchError(),
        });

        if (!response.ok) return yield* new FetchError();

        const json = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: () => new JsonError(),
        });

        return yield* Schema.decodeUnknown(Pokemon)(json);
      }),
    };
  }),
  dependencies: [PokemonCollection.Default, BuildPokeApiUrl.Default],
}) {}
