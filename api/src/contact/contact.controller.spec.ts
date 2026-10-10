import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ContactController } from './contact.controller';
import { ContactMailService } from './contact-mail.service';
import { CreateContactDto } from './dto/create-contact.dto';

describe('ContactController', () => {
  let controller: ContactController;
  let mailService: ContactMailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        {
          provide: ContactMailService,
          useValue: {
            sendContactQuery: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContactController>(ContactController);
    mailService = module.get<ContactMailService>(ContactMailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('honeypot filled -> returns { success: true } and sendContactQuery is not called', async () => {
    const dto: CreateContactDto = {
      name: 'Bot User',
      email: 'bot@example.com',
      message: 'This is automated spam content.',
      website: 'https://spam-link.com',
    };

    const result = await controller.create(dto);

    expect(result).toEqual({ success: true });
    expect(mailService.sendContactQuery).not.toHaveBeenCalled();
  });

  it('valid dto -> sendContactQuery called once and returns { success: true }', async () => {
    (mailService.sendContactQuery as jest.Mock).mockResolvedValue(true);

    const dto: CreateContactDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1 555-1234',
      subject: 'Inquiry',
      message: 'I would like to inquire about team onboarding.',
    };

    const result = await controller.create(dto);

    expect(mailService.sendContactQuery).toHaveBeenCalledTimes(1);
    expect(mailService.sendContactQuery).toHaveBeenCalledWith({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      subject: dto.subject,
      message: dto.message,
    });
    expect(result).toEqual({ success: true });
  });

  it('mail returns false -> ServiceUnavailableException', async () => {
    (mailService.sendContactQuery as jest.Mock).mockResolvedValue(false);

    const dto: CreateContactDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'I would like to inquire about team onboarding.',
    };

    await expect(controller.create(dto)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  describe('class-validator validation rules', () => {
    it('validate() rejects an invalid email and a 3-character message', async () => {
      const invalidData = {
        name: 'Jane Doe',
        email: 'not-an-email',
        message: 'hey', // shorter than 10 characters
      };

      const dtoInstance = plainToInstance(CreateContactDto, invalidData);
      const errors = await validate(dtoInstance);

      expect(errors.length).toBeGreaterThanOrEqual(2);

      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints).toHaveProperty('isEmail');

      const messageError = errors.find((e) => e.property === 'message');
      expect(messageError).toBeDefined();
      expect(messageError?.constraints).toHaveProperty('minLength');
    });
  });
});
