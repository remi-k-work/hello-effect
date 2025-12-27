import { Schema } from "effect";

export const StringPairsFromStrings = Schema.Array(Schema.String).pipe(
  Schema.filter((arr) => arr.every((s) => s.split(": ").length === 2)),
  Schema.transform(Schema.Array(Schema.Tuple(Schema.String, Schema.String)), {
    decode: (arr) => arr.map((s) => s.split(": ") as unknown as readonly [string, string]),
    encode: (arr) => arr.map((s) => s.join(": ")),
  }),
);
