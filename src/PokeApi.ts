import { Effect, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";

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

export class PokeApi2 extends Effect.Service<PokeApi2>()("PokeApi2", {
  dependencies: [PokemonCollection.Default, BuildPokeApiUrl.Default, FetchHttpClient.layer],

  effect: Effect.gen(function* () {
    const pokemonCollection = yield* PokemonCollection;
    const buildPokeApiUrl = yield* BuildPokeApiUrl;
    const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk, HttpClient.mapRequest(HttpClientRequest.acceptJson));

    return {
      getPokemon: Effect.gen(function* () {
        const requestUrl = buildPokeApiUrl(yield* Effect.fromNullable(pokemonCollection[0]));

        const response = yield* client.get(requestUrl);

        return yield* HttpClientResponse.schemaBodyJson(Pokemon)(response);
      }),
    };
  }),
}) {}
