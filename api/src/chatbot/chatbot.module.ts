import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [CompaniesModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}

