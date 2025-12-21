import { Config, Effect } from "effect";

export class PokeApiUrl extends Effect.Service<PokeApiUrl>()("PokeApiUrl", {
  effect: Effect.gen(function* () {
    const baseUrl = yield* Config.string("BASE_URL");
    return { pokeApiUrl: `${baseUrl}/api/v2/pokemon` } as const;
  }),
}) {}
