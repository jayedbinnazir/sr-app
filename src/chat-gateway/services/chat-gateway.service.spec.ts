import { Test, TestingModule } from '@nestjs/testing';
import { ChatGatewayService } from './chat-gateway.service';

describe('ChatGatewayService', () => {
  let service: ChatGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGatewayService],
    }).compile();

    service = module.get<ChatGatewayService>(ChatGatewayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
