import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { Throttle } from '@nestjs/throttler';
import { RequireAccess } from '../access/decorators/require-access.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantScoped } from '../common/tenant.decorators';

@Controller('companies/:companySlug/chatbot')
@UseGuards(JwtAuthGuard)
@TenantScoped()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * POST /companies/:companySlug/chatbot/chat
   *
   * Accepts a user message and responds with Claude's AI-generated reply
   * after executing any required tool calls (task creation, project lookup, etc.)
   * inside the current company scope.
   *
   * Rate-limited to 30 requests per minute per user to prevent API quota abuse.
   */
  @Post('chat')
  @RequireAccess({ module: 'chatbot', action: 'use' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async chat(
    @Request() req: any,
    @Body() body: ChatMessageDto,
  ) {
    // Extract the Bearer token from header or cookie so the chatbot
    // service can forward it to the NestJS API on behalf of the user.
    const authHeader: string = req.headers?.authorization ?? '';
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.access_token ?? '';

    const userId: string = req.user?.id || req.user?._id?.toString() || '';
    const email: string = req.user?.email || '';
    const companySlug: string = req.params?.companySlug || req.company?.slug || '';
    const companyName: string = req.company?.name || companySlug;

    const result = await this.chatbotService.chat(
      userId,
      bearerToken,
      body.message,
      companySlug,
      companyName,
      email,
    );

    return {
      message: result.message,
      toolsUsed: result.toolsUsed,
      timestamp: new Date().toISOString(),
    };
  }
}

