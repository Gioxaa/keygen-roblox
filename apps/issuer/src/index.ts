import 'dotenv/config';

import env from './env.js';
import { createServer } from './server.js';

const bootstrap = async () => {
  const { app, close } = await createServer();

  const server = app.listen(env.PORT, () => {
    console.log(`Issuer listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down...`);
    server.close((err) => {
      if (err) {
        console.error('Error closing HTTP server', err);
      }

      close()
        .catch((closeErr) => {
          console.error('Failed during shutdown cleanup', closeErr);
        })
        .finally(() => {
          process.exit(err ? 1 : 0);
        });
    });
  };

  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal);
    });
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start issuer service', error);
  process.exit(1);
});
