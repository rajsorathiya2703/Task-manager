import { Test, TestingModule } from '@nestjs/testing';
import { EmailService, escapeHtml } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let sendEmailSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
    sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('escapeHtml', () => {
    it('escapes special HTML characters', () => {
      expect(escapeHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
      expect(escapeHtml('"hello" & \'world\' <test>')).toBe(
        '&quot;hello&quot; &amp; &#39;world&#39; &lt;test&gt;',
      );
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('sendInviteEmail', () => {
    it('generates company-aware links when companySlug is provided and escapes user input', async () => {
      await service.sendInviteEmail(
        'invitee@example.com',
        '<b>Malicious Task</b>',
        '<b>Attacker</b>',
        'acme-corp',
      );

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.to).toBe('invitee@example.com');
      // Company slug is part of the URL
      expect(callArg.html).toContain('/acme-corp/tasks');
      expect(callArg.text).toContain('/acme-corp/tasks');

      // Escapes HTML tags in HTML template to prevent XSS
      expect(callArg.html).toContain('&lt;b&gt;Malicious Task&lt;/b&gt;');
      expect(callArg.html).toContain('&lt;b&gt;Attacker&lt;/b&gt;');
      expect(callArg.html).not.toContain('<h3><b>Malicious Task</b></h3>');
      expect(callArg.html).not.toContain('<strong><b>Attacker</b></strong>');
    });

    it('falls back to default link when companySlug is not provided', async () => {
      await service.sendInviteEmail(
        'invitee@example.com',
        'Standard Task',
        'Normal User',
      );

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.html).toMatch(/\/tasks"/);
      expect(callArg.html).not.toMatch(/\/undefined\/tasks/);
    });
  });

  describe('sendTaskAssignmentEmail', () => {
    it('generates company-aware taskId link and escapes all user values', async () => {
      await service.sendTaskAssignmentEmail(
        'dev@example.com',
        '<b>Task Title</b>',
        '<script>assigner</script>',
        '<i>Employee</i>',
        'task-123',
        '<u>Project X</u>',
        'globex',
      );

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.to).toBe('dev@example.com');
      // Correct URL with company slug and taskId
      expect(callArg.html).toContain('/globex/tasks/task-123');
      expect(callArg.text).toContain('/globex/tasks/task-123');

      // HTML escaped
      expect(callArg.html).toContain('&lt;b&gt;Task Title&lt;/b&gt;');
      expect(callArg.html).toContain('&lt;script&gt;assigner&lt;/script&gt;');
      expect(callArg.html).toContain('&lt;i&gt;Employee&lt;/i&gt;');
      expect(callArg.html).toContain('&lt;u&gt;Project X&lt;/u&gt;');

      // No raw unescaped strings
      expect(callArg.html).not.toContain('<h3><b>Task Title</b></h3>');
      expect(callArg.html).not.toContain('<script>assigner</script>');
    });

    it('generates fallback task list link when taskId is missing but companySlug is present', async () => {
      await service.sendTaskAssignmentEmail(
        'dev@example.com',
        'Task without ID',
        'Assigner',
        'Employee',
        undefined,
        undefined,
        'globex',
      );

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.html).toContain('/globex/tasks"');
      expect(callArg.html).not.toContain('/globex/tasks/undefined');
    });

    it('generates non-tenant URL when companySlug is omitted', async () => {
      await service.sendTaskAssignmentEmail(
        'dev@example.com',
        'Legacy Task',
        'Lead',
        'Dev',
        'task-456',
      );

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.html).toContain('/tasks/task-456');
      expect(callArg.html).not.toContain('/undefined/tasks');
    });
  });

  describe('sendEmployeeInvite (BUG-01)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('sends invitation email with company name, inviter, and one button linking to WEB_URL', async () => {
      process.env.WEB_URL = 'https://app.taskmanager.io';

      await service.sendEmployeeInvite({
        to: 'newemp@example.com',
        employeeName: 'Jane Doe',
        companyName: 'Acme Corp',
        inviterName: 'Admin Alice',
      });

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.to).toBe('newemp@example.com');
      expect(callArg.subject).toContain('Acme Corp');
      expect(callArg.text).toContain('Admin Alice');
      expect(callArg.text).toContain('https://app.taskmanager.io');
      expect(callArg.html).toContain('Acme Corp');
      expect(callArg.html).toContain('Admin Alice');
      expect(callArg.html).toContain('Jane Doe');
      expect(callArg.html).toContain('href="https://app.taskmanager.io"');
      expect(callArg.html).toContain('Log in to Workspace');
    });

    it('escapes HTML tags in company name, inviter name, and employee name', async () => {
      process.env.WEB_URL = 'https://app.taskmanager.io';

      await service.sendEmployeeInvite({
        to: 'newemp@example.com',
        employeeName: '<script>alert("emp")</script>',
        companyName: '<b>Evil Company</b>',
        inviterName: '<img src=x onerror=alert(1)>',
      });

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.html).toContain('&lt;script&gt;alert(&quot;emp&quot;)&lt;/script&gt;');
      expect(callArg.html).toContain('&lt;b&gt;Evil Company&lt;/b&gt;');
      expect(callArg.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(callArg.html).not.toContain('<script>');
      expect(callArg.html).not.toContain('<b>Evil Company</b>');
    });
  });
});

