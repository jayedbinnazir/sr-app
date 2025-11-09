import { Module } from '@nestjs/common';
import { ChatGatewayController } from './controllers/chat-gateway.controller';
import { ChatGatewayService } from './services/chat-gateway.service';

@Module({
  controllers: [ChatGatewayController],
  providers: [ChatGatewayService],
})
export class ChatGatewayModule {}
