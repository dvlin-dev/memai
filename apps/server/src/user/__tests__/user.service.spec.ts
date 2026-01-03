/**
 * UserService 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user.service';
import { createPrismaMock, PrismaMock } from '../../../test/mocks';

// Mock better-auth/crypto
vi.mock('better-auth/crypto', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let prismaMock: PrismaMock;

  const USER_ID = 'test-user-id';

  const mockUser = {
    id: USER_ID,
    email: 'test@example.com',
    name: 'Test User',
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    subscription: {
      tier: 'HOBBY',
    },
    quota: {
      monthlyApiLimit: 5000,
      monthlyApiUsed: 100,
      periodEndAt: new Date(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock = createPrismaMock();
    service = new UserService(prismaMock as any);
  });

  describe('getUserProfile', () => {
    it('应返回用户资料', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserProfile(USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.email).toBe('test@example.com');
      expect(result.tier).toBe('HOBBY');
      expect(result.quota).toBeDefined();
      expect(result.quota?.monthlyRemaining).toBe(4900);
    });

    it('应在用户不存在时抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('应返回 FREE 层级当无订阅时', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        subscription: null,
      });

      const result = await service.getUserProfile(USER_ID);

      expect(result.tier).toBe('FREE');
    });

    it('应返回 null 配额当无配额记录时', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        quota: null,
      });

      const result = await service.getUserProfile(USER_ID);

      expect(result.quota).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('应更新用户名', async () => {
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        name: 'New Name',
      });

      const result = await service.updateProfile(USER_ID, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { name: 'New Name' },
        include: { subscription: true, quota: true },
      });
    });
  });

  describe('changePassword', () => {
    const mockAccount = {
      id: 'account-id',
      userId: USER_ID,
      providerId: 'credential',
      password: 'old-hashed-password',
    };

    it('应成功修改密码', async () => {
      const { verifyPassword } = await import('better-auth/crypto');
      (verifyPassword as any).mockResolvedValue(true);

      prismaMock.account.findFirst.mockResolvedValue(mockAccount);
      prismaMock.account.update.mockResolvedValue({});

      await service.changePassword(USER_ID, {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      });

      expect(prismaMock.account.update).toHaveBeenCalledWith({
        where: { id: 'account-id' },
        data: { password: 'hashed-password' },
      });
    });

    it('应在无密码认证时抛出 BadRequestException', async () => {
      prismaMock.account.findFirst.mockResolvedValue(null);

      await expect(
        service.changePassword(USER_ID, {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应在当前密码错误时抛出 UnauthorizedException', async () => {
      const { verifyPassword } = await import('better-auth/crypto');
      (verifyPassword as any).mockResolvedValue(false);

      prismaMock.account.findFirst.mockResolvedValue(mockAccount);

      await expect(
        service.changePassword(USER_ID, {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteAccount', () => {
    it('应成功软删除账户', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      const txMock = {
        accountDeletionRecord: { create: vi.fn().mockResolvedValue({}) },
        user: { update: vi.fn().mockResolvedValue({}) },
        session: { deleteMany: vi.fn().mockResolvedValue({}) },
      };
      prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock));

      await service.deleteAccount(USER_ID, {
        confirmation: 'test@example.com',
        reason: 'no_longer_needed',
      });

      expect(txMock.accountDeletionRecord.create).toHaveBeenCalled();
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { deletedAt: expect.any(Date) },
      });
      expect(txMock.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
    });

    it('应在用户不存在时抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAccount('non-existent', {
          confirmation: 'test@example.com',
          reason: 'no_longer_needed',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应在账户已删除时抛出 BadRequestException', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(
        service.deleteAccount(USER_ID, {
          confirmation: 'test@example.com',
          reason: 'no_longer_needed',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应在确认邮箱不匹配时抛出 BadRequestException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.deleteAccount(USER_ID, {
          confirmation: 'wrong@example.com',
          reason: 'no_longer_needed',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应记录删除反馈', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      const txMock = {
        accountDeletionRecord: { create: vi.fn().mockResolvedValue({}) },
        user: { update: vi.fn().mockResolvedValue({}) },
        session: { deleteMany: vi.fn().mockResolvedValue({}) },
      };
      prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock));

      await service.deleteAccount(USER_ID, {
        confirmation: 'test@example.com',
        reason: 'no_longer_needed',
        feedback: 'Great product but no longer need it',
      });

      expect(txMock.accountDeletionRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          feedback: 'Great product but no longer need it',
        }),
      });
    });
  });
});
