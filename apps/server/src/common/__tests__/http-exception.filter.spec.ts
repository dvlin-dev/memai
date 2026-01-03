/**
 * HttpExceptionFilter 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ArgumentsHost,
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  let mockRequest: { method: string; url: string };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockRequest = {
      method: 'GET',
      url: '/api/v1/test',
    };

    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('HttpException 处理', () => {
    it('应处理 400 BadRequestException', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理 401 UnauthorizedException', () => {
      const exception = new UnauthorizedException('Not authenticated');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理 403 ForbiddenException', () => {
      const exception = new ForbiddenException('Access denied');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理 404 NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理 409 ConflictException', () => {
      const exception = new ConflictException('Resource already exists');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理 500 InternalServerErrorException', () => {
      const exception = new InternalServerErrorException('Server error');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('验证错误处理', () => {
    it('应处理 ValidationPipe 错误（数组消息）', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: ['email must be an email', 'name should not be empty'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'email must be an email', // 第一个错误
          details: ['email must be an email', 'name should not be empty'],
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理带 details 的异常', () => {
      const exception = new BadRequestException({
        message: 'Validation failed',
        details: { field: 'email', constraint: 'isEmail' },
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Validation failed',
          details: { field: 'email', constraint: 'isEmail' },
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('字符串响应处理', () => {
    it('应处理字符串类型的异常响应', () => {
      const exception = new HttpException('Simple error message', 400);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Simple error message',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('非 HttpException 处理', () => {
    it('应处理普通 Error', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理 TypeError', () => {
      const exception = new TypeError('Cannot read property of undefined');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Cannot read property of undefined',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理非 Error 类型的异常', () => {
      const exception = 'Just a string error';

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理 null 异常', () => {
      filter.catch(null, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
        timestamp: expect.any(String),
      });
    });

    it('应处理 undefined 异常', () => {
      filter.catch(undefined, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('未知状态码', () => {
    it('应对未映射的状态码返回 UNKNOWN_ERROR', () => {
      const exception = new HttpException('Custom error', 418); // I'm a teapot

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(418);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Custom error',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('timestamp', () => {
    it('应包含有效的 ISO 时间戳', () => {
      const exception = new BadRequestException('test');

      filter.catch(exception, mockHost);

      const response = mockResponse.json.mock.calls[0][0];
      const timestamp = response.timestamp;

      // 验证是有效的 ISO 时间戳
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
    });
  });
});
