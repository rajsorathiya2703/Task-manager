import {
  Controller,
  Post,
  Body,
  HttpCode,
  UseGuards,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { ContactMailService } from './contact-mail.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Public()
@Controller('contact')
@UseGuards(ThrottlerGuard)
export class ContactController {
  constructor(private readonly contactMailService: ContactMailService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(201)
  @Post()
  async create(@Body() createContactDto: CreateContactDto) {
    // Honeypot protection: if website field is populated, silently return success without dispatching email
    if (createContactDto.website && createContactDto.website.trim().length > 0) {
      return { success: true };
    }

    const sent = await this.contactMailService.sendContactQuery({
      name: createContactDto.name,
      email: createContactDto.email,
      phone: createContactDto.phone,
      subject: createContactDto.subject,
      message: createContactDto.message,
    });

    if (!sent) {
      throw new ServiceUnavailableException(
        'We could not send your message right now. Please email us directly.',
      );
    }

    return { success: true };
  }
}
