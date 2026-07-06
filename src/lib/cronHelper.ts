// Lightweight helper to run background work safely on Vercel or fall back to best-effort async
import { waitUntil } from '@vercel/functions';

export async function runInBackground(task: () => Promise<any>) {
  try {
    // If running on Vercel, waitUntil is natively available in the environment
    if (typeof waitUntil === 'function') {
      waitUntil(task());
      return { scheduled: true };
    }
  } catch (e) {
    // Fail silently and move to fallback if the package isn't resolved
  }

  // Fallback: start the task and don't await it — best-effort background execution
  task().catch((err) => {
    // Ensure errors are logged but do not affect the immediate response
    // eslint-disable-next-line no-console
    console.error('Background task error (fallback):', err);
  });

  return { scheduled: false };
}

export default runInBackground;
