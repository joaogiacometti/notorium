type CleanupTask = () => Promise<void>;

export async function runWithCleanup(
  callback: (registerCleanup: (task: CleanupTask) => void) => Promise<void>,
) {
  const cleanups: CleanupTask[] = [];
  const errors: unknown[] = [];

  const registerCleanup = (task: CleanupTask) => {
    cleanups.push(task);
  };

  try {
    await callback(registerCleanup);
  } catch (error) {
    errors.push(error);
  }

  for (const cleanup of [...cleanups].reverse()) {
    try {
      await cleanup();
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, "Test failed with cleanup errors.");
  }
}
