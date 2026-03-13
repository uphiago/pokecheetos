export const logger = {
  info(context: Record<string, unknown>, message: string) {
    console.log(JSON.stringify({ level: 'info', message, ...context }));
  },
  error(context: Record<string, unknown>, message: string) {
    console.error(JSON.stringify({ level: 'error', message, ...context }));
  }
};
