import { Context, Effect } from "effect";
import { PokeApiUrl } from "./PokeApiUrl.js";

export class BuildPokeApiUrl extends Context.Tag("BuildPokeApiUrl")<BuildPokeApiUrl, (props: { name: string }) => string>() {
  static readonly Live = Effect.gen(function* () {
    const pokeApiUrl = yield* PokeApiUrl;
    return BuildPokeApiUrl.of(({ name }) => `${pokeApiUrl}/${name}`);
  });
}
