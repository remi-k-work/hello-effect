import { Data, Effect, pipe, Schedule } from "effect";

class IngredientError extends Data.TaggedError("IngredientError")<{
  readonly ingredient: string;
}> {}

class CustomerNotReadyError extends Data.TaggedError("CustomerNotReadyError")<{}> {}
class DishMissingError extends Data.TaggedError("DishMissingError")<{}> {}

const fetchIngredients = (ingredients: string[]): Effect.Effect<string[], IngredientError> =>
  ingredients.some((ingredient) => ingredient === "saffron") ? Effect.fail(new IngredientError({ ingredient: "saffron" })) : Effect.succeed(ingredients);

const prepareDish = (ingredients: string[]) =>
  Effect.gen(function* () {
    const result = yield* fetchIngredients(ingredients).pipe(
      Effect.catchTag("IngredientError", (error) =>
        Effect.gen(function* () {
          yield* Effect.log(`We are missing an ingredient: ${error.ingredient} from the list of ingredients: ${ingredients}`);
          return yield* recoverMissingIngredient(ingredients, error.ingredient);
        }),
      ),
    );
    return result;
  });

const recoverMissingIngredient = (dishIngredients: string[], missingIngredient: string) =>
  Effect.gen(function* () {
    yield* Effect.log(`Substituting ${missingIngredient} with turmeric`);

    // We map over the array: if the item matches the missing one, swap it.
    // This ensures we don't just append, but actually replace.
    return dishIngredients.map((item) => (item === missingIngredient ? "turmeric" : item));
  });

const askCustomer = (customerStatus: "ready" | "not ready") =>
  Effect.gen(function* () {
    if (customerStatus === "not ready") return yield* new CustomerNotReadyError();

    const dishes = ["pasta", "pizza", "risotto", "missing"];
    const dish = dishes[Math.floor(Math.random() * dishes.length)];
    if (dish === "missing") return yield* new DishMissingError();

    return dish;
  });

const policy = Schedule.addDelay(
  Schedule.recurs(3), // Retry for a maximum of 3 times
  () => "1000 millis", // Add a delay of 1000 milliseconds between retries
);

const getOrder = (customerStatus: "ready" | "not ready") =>
  Effect.retryOrElse(
    pipe(
      Effect.log(`Asking customer for an order. Customer status: ${customerStatus}`),
      Effect.flatMap(() => askCustomer(customerStatus)),
    ),
    policy,
    (e) => Effect.fail(e),
  );

const main = prepareDish(["saffron", "rice", "chicken"]).pipe(Effect.flatMap((ingredients) => Effect.log(`Using ${ingredients} for the dish`)));
const program = pipe(
  Effect.log("Let's prepare a dish"),
  Effect.map(() => (Math.random() > 0.5 ? "ready" : "not ready")),
  Effect.flatMap((customerStatus) => getOrder(customerStatus)),
  Effect.catchTags({
    CustomerNotReadyError: (error) => Effect.logError(`Customer still not ready. Exiting.`).pipe(Effect.flatMap(() => Effect.fail(error))),
    DishMissingError: () => Effect.log(`Dish missing. Falling back to a pizza.`).pipe(Effect.map(() => "pizza")),
  }),
  Effect.flatMap((order) => Effect.log(`Order received: ${order}`)),
  Effect.orDieWith((error) => error.message),
  Effect.flatMap(() => prepareDish(["saffron", "rice", "chicken"])),
  Effect.flatMap((ingredients) => Effect.log(`Using ${ingredients} for the dish`)),
  Effect.withLogSpan("Dish preparation"),
);

Effect.runPromise(program);
