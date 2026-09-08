export const createIdempotencyKey = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    if (character === 'x') return random.toString(16);
    return ['8', '9', 'a', 'b'][random % 4] ?? '8';
  });
