/**
 * Console Memory Controller
 * Memory 管理接口（控制台使用，Session 认证）
 */

import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { MemoryService } from './memory.service';

@Controller('api/console/memories')
export class ConsoleMemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  /**
   * 获取所有 Memories
   * GET /api/console/memories
   */
  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserDto,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.memoryService.listByUser(user.id, {
      apiKeyId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: result.memories,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  /**
   * 导出 Memories
   * GET /api/console/memories/export
   */
  @Get('export')
  async export(
    @CurrentUser() user: CurrentUserDto,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('format') format?: string,
    @Res() res?: Response,
  ) {
    if (format && !['json', 'csv'].includes(format)) {
      throw new BadRequestException('Format must be "json" or "csv"');
    }

    const result = await this.memoryService.exportByUser(user.id, {
      apiKeyId,
      format: (format as 'json' | 'csv') || 'json',
    });

    res!.setHeader('Content-Type', result.contentType);
    res!.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res!.send(result.data);
  }
}
