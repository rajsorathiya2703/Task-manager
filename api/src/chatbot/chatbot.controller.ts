import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { Throttle } from '@nestjs/throttler';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';

@Controller('chatbot')
@AllowAuthenticated()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * POST /chatbot/chat
   *
   * Accepts a user message and responds with Claude's AI-generated reply
   * after executing any required tool calls (task creation, project lookup, etc.).
   *
   * Rate-limited to 30 requests per minute per user to prevent API quota abuse.
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async chat(
    @Request() req: any,
    @Body() body: ChatMessageDto,
  ) {
    // Extract the Bearer token from the Authorization header so the chatbot
    // service can forward it to the NestJS API on behalf of the user.
    const authHeader: string = req.headers?.authorization ?? '';
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.access_token ?? '';

    const userId: string = req.user?.id || req.user?._id?.toString() || '';

    const result = await this.chatbotService.chat(userId, bearerToken, body.message);

    return {
      message: result.message,
      toolsUsed: result.toolsUsed,
      timestamp: new Date().toISOString(),
    };
  }
}
