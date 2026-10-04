import { Test, TestingModule } from '@nestjs/testing';
import { DayOffMailService, escapeHtml } from './day-off-mail.service';

describe('DayOffMailService', () => {
  let service: DayOffMailService;
  let sendEmailSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DayOffMailService],
    }).compile();

    service = module.get<DayOffMailService>(DayOffMailService);
    sendEmailSpy = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('escapeHtml', () => {
    it('escapes HTML tags and special characters properly', () => {
      expect(escapeHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
      expect(escapeHtml('<script>alert("hack")</script>')).toBe(
        '&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;',
      );
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('sendLeaveRequestToAdmin', () => {
    it('generates company-aware approveUrl and calendar links with HTML escaping', async () => {
      await service.sendLeaveRequestToAdmin({
        adminEmail: 'admin@example.com',
        applicationId: 'app-999',
        approvalToken: 'sec-token-123',
        employeeName: '<b>Alice Hacker</b>',
        employeeEmail: 'alice@example.com',
        leaveTypeName: '<script>Leave</script>',
        fromDateStr: '2026-10-05',
        toDateStr: '2026-10-06',
        daysCount: 2,
        reason: '<b>Emergency</b>',
        description: '<img src=x onerror=alert(1)>',
        companySlug: 'umbrella-corp',
      });

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.to).toBe('admin@example.com');

      // Check company-aware URLs
      expect(callArg.html).toContain(
        '/companies/umbrella-corp/day-off/applications/app-999/approve?token=sec-token-123',
      );
      expect(callArg.text).toContain(
        '/companies/umbrella-corp/day-off/applications/app-999/approve?token=sec-token-123',
      );
      expect(callArg.html).toContain('/umbrella-corp/dayoff/calendar');
      expect(callArg.text).toContain('/umbrella-corp/dayoff/calendar');

      // Check HTML escaping of user inputs
      expect(callArg.html).toContain('&lt;b&gt;Alice Hacker&lt;/b&gt;');
      expect(callArg.html).toContain('&lt;script&gt;Leave&lt;/script&gt;');
      expect(callArg.html).toContain('&lt;b&gt;Emergency&lt;/b&gt;');
      expect(callArg.html).toContain('&lt;img src=x onerror=alert(1)&gt;');

      // Ensure raw malicious strings are absent
      expect(callArg.html).not.toContain('<img src=x onerror=alert(1)>');
      expect(callArg.html).not.toContain('<script>Leave</script>');
    });

    it('falls back to non-tenant URLs when companySlug is not provided', async () => {
      await service.sendLeaveRequestToAdmin({
        adminEmail: 'admin@example.com',
        applicationId: 'app-888',
        approvalToken: 'token-abc',
        employeeName: 'Bob',
        employeeEmail: 'bob@example.com',
        leaveTypeName: 'Vacation',
        fromDateStr: '2026-11-01',
        toDateStr: '2026-11-03',
        daysCount: 3,
        reason: 'Travel',
      });

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.html).toContain('/day-off/applications/app-888/approve?token=token-abc');
      expect(callArg.html).toContain('/dayoff');
      expect(callArg.html).not.toContain('/companies/');
    });
  });

  describe('sendLeaveApprovedToEmployee', () => {
    it('generates company-aware calendar link and escapes employee and leaveTypeName', async () => {
      await service.sendLeaveApprovedToEmployee({
        employeeEmail: 'bob@example.com',
        employeeName: '<b>Bob Builder</b>',
        leaveTypeName: '<i>Sick Leave</i>',
        fromDateStr: '2026-10-10',
        toDateStr: '2026-10-11',
        daysCount: 1.5,
        approvedAtStr: '2026-10-02 10:00',
        companySlug: 'wayne-enterprises',
      });

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.to).toBe('bob@example.com');
      // Calendar URL contains company slug
      expect(callArg.html).toContain('/wayne-enterprises/dayoff/calendar');
      expect(callArg.text).toContain('/wayne-enterprises/dayoff/calendar');

      // User values escaped
      expect(callArg.html).toContain('&lt;b&gt;Bob Builder&lt;/b&gt;');
      expect(callArg.html).toContain('&lt;i&gt;Sick Leave&lt;/i&gt;');
      expect(callArg.html).not.toContain('Hello <b>Bob Builder</b>');
      expect(callArg.html).not.toContain('<i>Sick Leave</i>');
    });

    it('falls back to default calendar link when companySlug is not provided', async () => {
      await service.sendLeaveApprovedToEmployee({
        employeeEmail: 'bob@example.com',
        employeeName: 'Bob',
        leaveTypeName: 'Sick Leave',
        fromDateStr: '2026-10-10',
        toDateStr: '2026-10-11',
        daysCount: 1,
        approvedAtStr: '2026-10-02 10:00',
      });

      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEmailSpy.mock.calls[0][0];

      expect(callArg.html).toContain('/dayoff');
      expect(callArg.html).not.toContain('/undefined/dayoff');
    });
  });
});
