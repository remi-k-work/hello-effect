import { Effect } from "effect";

import type { ConfigError } from "effect/ConfigError";
import type { ParseError } from "effect/ParseResult";
import type { FetchError, JsonError } from "./errors.js";
import type { Pokemon } from "./schemas.js";

export interface PokeApi {
  readonly getPokemon: Effect.Effect<Pokemon, FetchError | JsonError | ParseError | ConfigError>;
}
