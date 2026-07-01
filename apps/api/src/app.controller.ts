import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly mongoConnection: Connection) {}

  /**
   * Liveness probe — confirms the process is running.
   * Used by Docker/Kubernetes to restart the container if it crashes.
   */
  @Get('health')
  liveness() {
    return {
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe — confirms the service is ready to serve traffic.
   * Returns 503 if the database is not connected.
   */
  @Get('health/ready')
  async readiness() {
    const dbState = this.mongoConnection.readyState;
    // 1 = connected
    const isReady = dbState === 1;
    return {
      success: isReady,
      status: isReady ? 'ok' : 'unavailable',
      checks: {
        database: {
          status: isReady ? 'up' : 'down',
          state: dbState,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
