import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

@WebSocketGateway({ cors: true })
export class ChatGatewayService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Map of connected users: userId -> socketId
  private users = new Map<string, string>();

  // Lifecycle hook after server is initialized
  async afterInit(server: Server) {
    const pubClient = createClient({
      url: 'redis://:myStrongPassword@redis:6379',
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    server.adapter(createAdapter(pubClient, subClient));

    console.log('✅ Redis adapter initialized');
  }

  // When a client connects
  handleConnection(socket: Socket) {
    console.log('Client connected:', socket.id);
  }

  // When a client disconnects
  handleDisconnect(socket: Socket) {
    console.log('Client disconnected:', socket.id);
    for (const [userId, sId] of this.users.entries()) {
      if (sId === socket.id) this.users.delete(userId);
    }
  }

  // Client sends their userId after login
  @SubscribeMessage('onConnection')
  registerUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    this.users.set(data.userId, socket.id);
    console.log('📘 Registered users:', this.users);

    // TODO: fetch pending messages from DB and emit to this user
    // Example:
    // const pending = await this.messageService.getPendingMessages(data.userId);
    // pending.forEach(msg => socket.emit('message', msg));
  }

  // Client sends a new message
  @SubscribeMessage('newMessage')
  handleMessage(
    @MessageBody() data: { fromUserId: string; toUserId: string; msg: string },
  ) {
    console.log(
      `💬 Message from ${data.fromUserId} → ${data.toUserId}:`,
      data.msg,
    );

    // TODO: save to DB as pending
    // await this.messageService.create(data);

    const recipientSocketId = this.users.get(data.toUserId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('message', {
        from: data.fromUserId,
        text: data.msg,
      });
      // TODO: mark DB message as delivered
    } else {
      console.log(`⚠️ User ${data.toUserId} is offline. Message stored in DB`);
    }
  }
}
