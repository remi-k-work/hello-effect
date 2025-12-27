import { Array, Option } from "effect";

// Helper function to get the value of a CLI option
export function getCliOption(cliArgs: string[], option: { name: string; alias?: string }): Option.Option<string> {
  return Option.gen(function* () {
    // findFirstIndex returns Option<number> automatically!
    const index = yield* Array.findFirstIndex(cliArgs, (arg) => arg === `--${option.name}` || (option.alias !== undefined && arg === `-${option.alias}`));

    // Array.get returns Option<string> safely (handles out-of-bounds)
    return yield* Array.get(cliArgs, index + 1);
  });
}

// Helper function to get multiple values of a CLI option
export function getCliOptionMultiple(cliArgs: string[], option: { name: string; alias?: string }): string[] {
  return Array.filterMap(cliArgs, (arg, index) => {
    // Check if the current argument matches the flag
    const isMatch = arg === `--${option.name}` || (option.alias !== undefined && arg === `-${option.alias}`);

    if (isMatch) {
      // Safely look ahead for the value
      // If cliArgs[index + 1] is missing, Array.get returns None
      return Array.get(cliArgs, index + 1);
    }

    // If it's not our flag, return None (it will be filtered out)
    return Option.none();
  });
}
