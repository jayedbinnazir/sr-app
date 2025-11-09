import { Test, TestingModule } from '@nestjs/testing';
import { ChatGatewayController } from './chat-gateway.controller';
import { ChatGatewayService } from '../services/chat-gateway.service';

describe('ChatGatewayController', () => {
  let controller: ChatGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatGatewayController],
      providers: [ChatGatewayService],
    }).compile();

    controller = module.get<ChatGatewayController>(ChatGatewayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
