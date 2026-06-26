import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'jwt',
      'req.headers.authorization',
      'req.body.password',
      'req.body.token'
    ],
    censor: '***'
  },
  transport: process.env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    : undefined,
});

export default logger;
