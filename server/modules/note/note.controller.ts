import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  NoteItem,
  NoteListResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
} from '@shared/api.interface';
import { NoteService } from './note.service';

interface NoteCategoryCount {
  category: string;
  count: number;
}

@Controller('api/note')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @NeedLogin()
  @Get()
  async getNoteList(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('isPinned') isPinned?: string,
  ): Promise<NoteListResponse> {
    const { userId } = req.userContext;
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    const isPinnedBool =
      isPinned === undefined ? undefined : isPinned === 'true';
    return this.noteService.getNoteList(userId, {
      page: pageNum,
      pageSize: pageSizeNum,
      category,
      keyword,
      isPinned: isPinnedBool,
    });
  }

  @NeedLogin()
  @Get('categories')
  async getCategories(@Req() req: Request): Promise<NoteCategoryCount[]> {
    const { userId } = req.userContext;
    return this.noteService.getCategories(userId);
  }

  @NeedLogin()
  @Get(':id')
  async getNoteDetail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<NoteItem> {
    const { userId } = req.userContext;
    const note: NoteItem | null = await this.noteService.getNoteDetail(
      userId,
      id,
    );
    if (!note) {
      throw new NotFoundException('笔记不存在');
    }
    return note;
  }

  @NeedLogin()
  @Post()
  async createNote(
    @Req() req: Request,
    @Body() dto: CreateNoteRequest,
  ): Promise<NoteItem> {
    const { userId } = req.userContext;
    if (!dto.title) {
      throw new BadRequestException('title 必填');
    }
    return this.noteService.createNote(userId, dto);
  }

  @NeedLogin()
  @Patch(':id')
  async updateNote(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateNoteRequest,
  ): Promise<NoteItem> {
    const { userId } = req.userContext;
    const updated: NoteItem | null = await this.noteService.updateNote(
      userId,
      id,
      dto,
    );
    if (!updated) {
      throw new NotFoundException('笔记不存在');
    }
    return updated;
  }

  @NeedLogin()
  @Delete(':id')
  async deleteNote(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    const deleted: boolean = await this.noteService.deleteNote(userId, id);
    if (!deleted) {
      throw new NotFoundException('笔记不存在');
    }
    return { success: true };
  }
}
