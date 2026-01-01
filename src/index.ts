import { Effect, Layer, ManagedRuntime } from "effect";

import { PokeApi2 } from "./PokeApi.js";

const MainLayer = Layer.mergeAll(PokeApi2.Default);
const PokemonRuntime = ManagedRuntime.make(MainLayer);

const program = Effect.gen(function* () {
  const pokeApi = yield* PokeApi2;
  return yield* pokeApi.getPokemon;
});

const main = program.pipe(
  Effect.catchTags({
    // FetchError: () => Effect.succeed("Fetch error"),
    // JsonError: () => Effect.succeed("Json error"),
    ParseError: () => Effect.succeed("Parse error"),
  }),
);

PokemonRuntime.runPromise(main).then(console.log).catch(console.error);
