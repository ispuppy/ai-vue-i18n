export default class AIError extends Error {
  options: {};
  constructor(message: string, options = {}) {
    super(message);
    this.name = 'AIError';
    this.options = options;
  }
}