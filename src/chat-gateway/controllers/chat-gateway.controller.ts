import { Controller, Body } from '@nestjs/common';
import { ChatGatewayService } from '../services/chat-gateway.service';
// import { UpdateChatGatewayDto } from '../dto/update-chat-gateway.dto';

@Controller('chat-gateway')
export class ChatGatewayController {
  constructor(private readonly chatGatewayService: ChatGatewayService) {}

  // @Post()
  // create(@Body() createChatGatewayDto: CreateChatGatewayDto) {
  //   return this.chatGatewayService.create(createChatGatewayDto);
  // }

  // @Get()
  // findAll() {
  //   return this.chatGatewayService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.chatGatewayService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateChatGatewayDto: UpdateChatGatewayDto,
  // ) {
  //   return this.chatGatewayService.update(+id, updateChatGatewayDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.chatGatewayService.remove(+id);
  // }
}
