import { Effect, Layer, ManagedRuntime } from "effect";
import { PokeApi } from "./PokeApi.js";

const MainLayer = Layer.mergeAll(PokeApi.Default);
const PokemonRuntime = ManagedRuntime.make(MainLayer);

const program = Effect.gen(function* () {
  const pokeApi = yield* PokeApi;
  return yield* pokeApi.getPokemon;
});

const runnable = program.pipe(Effect.provide(MainLayer));

const main = runnable.pipe(
  Effect.catchTags({
    FetchError: () => Effect.succeed("Fetch error"),
    JsonError: () => Effect.succeed("Json error"),
    ParseError: () => Effect.succeed("Parse error"),
  }),
);

PokemonRuntime.runPromise(main).then(console.log);
