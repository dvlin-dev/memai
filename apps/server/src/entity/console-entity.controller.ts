/**
 * Console Entity Controller
 * Entity 管理接口（控制台使用，Session 认证）
 */

import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { EntityService } from './entity.service';
import { parsePaginationParams } from '../common/utils';

@Controller('api/console/entities')
export class ConsoleEntityController {
  constructor(private readonly entityService: EntityService) {}

  /**
   * 获取所有 Entities
   * GET /api/console/entities
   */
  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserDto,
    @Query('type') type?: string,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination = parsePaginationParams(limit, offset);

    const result = await this.entityService.listByUser(user.id, {
      type,
      apiKeyId,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      success: true,
      data: result.entities,
      meta: {
        total: result.total,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    };
  }

  /**
   * 获取所有 Entity 类型
   * GET /api/console/entities/types
   */
  @Get('types')
  async getTypes(@CurrentUser() user: CurrentUserDto) {
    const types = await this.entityService.getTypesByUser(user.id);

    return {
      success: true,
      data: types,
    };
  }

  /**
   * 删除 Entity
   * DELETE /api/console/entities/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ): Promise<void> {
    await this.entityService.deleteByUser(user.id, id);
  }
}
