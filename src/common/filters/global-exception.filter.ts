import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as path from 'path';
import { promises as fs } from 'fs';

export interface ErrorData {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {} // Fixed parameter name

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let path = 'unknown';

    // Handle different transport types
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message; // Handle non-HttpException errors
    }

    // Get context-specific information
    if (contextType === 'http') {
      const { httpAdapter } = this.httpAdapterHost; // Fixed: use httpAdapterHost
      const ctx = host.switchToHttp();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      path = httpAdapter.getRequestUrl(ctx.getRequest());

      const body: ErrorData = {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path,
      };

      // Log the error
      void this.writeHttpLog(body);

      httpAdapter.reply(ctx.getResponse(), body, status);
    } else if (contextType === 'ws') {
      // Handle WebSocket errors
      const ctx = host.switchToWs();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const client = ctx.getClient();
      path = 'websocket';

      const body: ErrorData = {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path,
      };

      // Log the error
      void this.writeHttpLog(body);

      // Send error to WebSocket client
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      client.emit('error', body); // Send full body for consistency
    } else if (contextType === 'rpc') {
      // Handle RPC/microservice errors
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const ctx = host.switchToRpc();
      path = 'rpc';

      const body: ErrorData = {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path,
      };

      // Log the error
      void this.writeHttpLog(body);

      // Return error for RPC
      return body; // Return full body for consistency
    }
  }

  private async writeHttpLog(body: ErrorData) {
    const LOG_DIR = path.join(process.cwd(), 'logs', `${Date.now()}-log.json`);

    try {
      // Ensure logs directory exists
      await fs.mkdir(path.dirname(LOG_DIR), { recursive: true });
      await fs.writeFile(LOG_DIR, JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('Error writing log file:', error);
    }
  }
}
