import { Injectable, Logger } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly gateway: NotificationGateway) {}

  notifyUser(userId: string, event: string, payload: unknown): void {
    if (!userId) {
      return;
    }
    const emitted = this.gateway.emitToUser(userId, event, payload);
    if (!emitted) {
      this.logger.debug(
        `Notification skipped: gateway not ready for user ${userId}`,
      );
    }
  }

  broadcast(event: string, payload: unknown): void {
    const emitted = this.gateway.broadcast(event, payload);
    if (!emitted) {
      this.logger.debug('Notification broadcast skipped; gateway not ready');
    }
  }
}


