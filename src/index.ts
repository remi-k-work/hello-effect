import { Config, Effect } from "effect";
import { FetchError, JsonError } from "./errors.js";
import { decodePokemon } from "./schemas.js";

/** Configuration **/
const config = Config.string("BASE_URL");

/** Implementation **/
const getPokemon = Effect.gen(function* () {
  const baseUrl = yield* config;
  const response = yield* Effect.tryPromise({ try: () => fetch(`${baseUrl}/api/v2/pokemon/garchomp/`), catch: () => new FetchError() });
  if (!response.ok) return yield* Effect.fail(new FetchError());

  const json = yield* Effect.tryPromise({ try: () => response.json(), catch: () => new JsonError() });

  return yield* decodePokemon(json);
});

/** Error handling **/
const main = getPokemon.pipe(
  Effect.catchTags({
    FetchError: () => Effect.succeed("Fetch error"),
    JsonError: () => Effect.succeed("Json error"),
    ParseError: () => Effect.succeed("Parse error"),
  }),
);

/** Running effect **/
Effect.runPromise(main).then((result) => {
  console.log(result);
});
