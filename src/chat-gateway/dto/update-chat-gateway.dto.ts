import { PartialType } from '@nestjs/mapped-types';
import { CreateChatGatewayDto } from './create-chat-gateway.dto';

export class UpdateChatGatewayDto extends PartialType(CreateChatGatewayDto) {}
