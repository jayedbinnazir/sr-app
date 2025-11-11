import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

type RegisterPayload = {
  userId: string;
};

@Injectable()
@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly configService: ConfigService) {}

  @WebSocketServer()
  server: Server;

  async afterInit(server: Server): Promise<void> {
    try {
      const host = this.configService.get<string>('db.redis_host') ?? 'redis';
      const port = Number(this.configService.get<number>('db.redis_port') ?? 6379);
      const password = this.configService.get<string>('db.redis_password') ?? '';

      const url = password
        ? `redis://:${password}@${host}:${port}`
        : `redis://${host}:${port}`;

      const pubClient = createClient({ url });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);
      const redisAdapter = createAdapter(pubClient, subClient);
      const ioServer: Server =
        (server as unknown as { server?: Server }).server ?? server;
      if (typeof (ioServer as any).adapter === 'function') {
        (ioServer as any).adapter(redisAdapter);
        this.logger.log('Notification gateway connected to Redis');
      } else {
        this.logger.warn(
          'Socket server adapter() method unavailable; Redis adapter not applied',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialise Redis adapter', error as Error);
    }
  }

  handleConnection(socket: Socket): void {
    const maybeUserId = this.extractUserId(socket);
    if (maybeUserId) {
      this.registerSocketForUser(maybeUserId, socket);
    }
    this.logger.debug(`Socket connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket): void {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(socket.id);
      if (sockets && sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.debug(`Socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage('notifications.register')
  onRegister(
    @MessageBody() payload: RegisterPayload,
    @ConnectedSocket() socket: Socket,
  ): void {
    if (!payload?.userId) {
      this.logger.warn(
        `Socket ${socket.id} attempted to register without userId`,
      );
      return;
    }
    this.registerSocketForUser(payload.userId, socket);
    socket.emit('notifications.registered', {
      status: 'ok',
      userId: payload.userId,
    });
  }

  emitToUser(userId: string, event: string, data: unknown): boolean {
    if (!this.server) {
      this.logger.warn('Socket server not initialised yet');
      return false;
    }
    const room = this.buildRoom(userId);
    this.server.to(room).emit(event, data);
    return true;
  }

  broadcast(event: string, data: unknown): boolean {
    if (!this.server) {
      this.logger.warn('Socket server not initialised yet');
      return false;
    }
    this.server.emit(event, data);
    return true;
  }

  private registerSocketForUser(userId: string, socket: Socket): void {
    socket.data.userId = userId;
    socket.join(this.buildRoom(userId));

    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(socket.id);
    this.userSockets.set(userId, sockets);

    this.logger.debug(
      `Registered socket ${socket.id} for user ${userId} (total sockets: ${sockets.size})`,
    );
  }

  private extractUserId(socket: Socket): string | undefined {
    const queryValue = socket.handshake.query.userId;
    if (typeof queryValue === 'string' && queryValue.trim()) {
      return queryValue;
    }
    return undefined;
  }

  private buildRoom(userId: string): string {
    return `user:${userId}`;
  }
}


