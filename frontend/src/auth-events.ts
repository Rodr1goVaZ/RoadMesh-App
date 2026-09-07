let handler: ((status: number) => void) | null = null;
export const authEvents = {
  listen: (next: ((status: number) => void) | null) => { handler = next; },
  emit: (status: number) => handler?.(status),
};