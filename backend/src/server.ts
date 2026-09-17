import { createApp } from "./app";
import { env } from "./config/env";
import { checkDbConnection } from "./config/db";
import { logger } from "./utils/logger";

async function bootstrap(): Promise<void> {
  try {
    await checkDbConnection(); // fail fast if DB is unreachable at startup

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 CSCMS API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // Graceful shutdown on SIGTERM/SIGINT (important in containerized deployments)
    const shutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error("Failed to start server", { error: (err as Error).message });
    process.exit(1);
  }
}

bootstrap();
