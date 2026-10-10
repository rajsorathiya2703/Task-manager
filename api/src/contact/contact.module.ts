import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactMailService } from './contact-mail.service';

@Module({
  controllers: [ContactController],
  providers: [ContactMailService],
})
export class ContactModule {}
