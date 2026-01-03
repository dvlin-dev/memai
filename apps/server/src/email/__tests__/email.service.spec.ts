/**
 * EmailService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from '../email.service';

// Mock send function
const mockSend = vi.fn();

// Mock Resend class
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSend };
    constructor() {}
  },
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ id: 'email-id' });
  });

  describe('未配置 API Key 时', () => {
    beforeEach(() => {
      configService = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return undefined;
          if (key === 'EMAIL_FROM') return 'Test <test@test.com>';
          return undefined;
        }),
      };
      service = new EmailService(configService as any);
    });

    it('sendEmail 应静默跳过', async () => {
      await expect(
        service.sendEmail('user@test.com', 'Subject', '<p>HTML</p>'),
      ).resolves.not.toThrow();
    });

    it('sendOTP 应静默跳过', async () => {
      await expect(service.sendOTP('user@test.com', '123456')).resolves.not.toThrow();
    });
  });

  describe('已配置 API Key 时', () => {
    beforeEach(() => {
      configService = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 'test-api-key';
          if (key === 'EMAIL_FROM') return 'Memory <noreply@memory.dev>';
          return undefined;
        }),
      };
      service = new EmailService(configService as any);
    });

    it('sendEmail 应发送邮件', async () => {
      await service.sendEmail('user@test.com', 'Test Subject', '<p>Test</p>');

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Memory <noreply@memory.dev>',
        to: 'user@test.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });
    });

    it('sendOTP 应发送验证码邮件', async () => {
      await service.sendOTP('user@test.com', '123456');

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Memory <noreply@memory.dev>',
        to: 'user@test.com',
        subject: 'Your Verification Code',
        html: expect.stringContaining('123456'),
      });
    });

    it('sendEmail 发送失败应抛出异常', async () => {
      mockSend.mockRejectedValueOnce(new Error('Send failed'));

      await expect(
        service.sendEmail('user@test.com', 'Subject', '<p>HTML</p>'),
      ).rejects.toThrow('Send failed');
    });

    it('sendOTP 发送失败应抛出异常', async () => {
      mockSend.mockRejectedValueOnce(new Error('Send failed'));

      await expect(service.sendOTP('user@test.com', '123456')).rejects.toThrow('Send failed');
    });
  });

  describe('默认发送者', () => {
    it('应使用默认发送者当未配置时', async () => {
      configService = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 'test-api-key';
          if (key === 'EMAIL_FROM') return undefined;
          return undefined;
        }),
      };
      service = new EmailService(configService as any);

      await service.sendEmail('user@test.com', 'Test', '<p>Test</p>');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Memory <noreply@memory.dev>',
        }),
      );
    });
  });
});
