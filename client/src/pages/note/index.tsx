import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  StickyNote,
  Search,
  Plus,
  FolderOpen,
  Clock,
  Trash2,
  Save,
  Tag,
  Pin,
  FileText,
  X,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  getNotes,
  getNoteDetail,
  createNote,
  updateNote,
  deleteNote,
  getCategories,
} from '@/api/note';
import type {
  NoteItem,
  CreateNoteRequest,
  UpdateNoteRequest,
} from '@shared/api.interface';

const NotePage = () => {
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesTotal, setNotesTotal] = useState(0);
  const [notesLoading, setNotesLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at_desc');

  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [isNewNote, setIsNewNote] = useState(false);

  // Editor state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.categories || []);
    } catch (err) {
      logger.error('fetch note categories failed', err);
      toast.error('加载分类失败');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Fetch notes list
  const fetchNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const res = await getNotes({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        keyword: searchKeyword || undefined,
        sortBy,
        pageSize: 50,
      });
      setNotes(res.items || []);
      setNotesTotal(res.total || 0);
    } catch (err) {
      logger.error('fetch notes failed', err);
      toast.error('加载笔记列表失败');
    } finally {
      setNotesLoading(false);
    }
  }, [selectedCategory, searchKeyword, sortBy]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  // Select first note when list loads
  useEffect(() => {
    if (!notesLoading && notes.length > 0 && !selectedNote && !isNewNote) {
      void handleSelectNote(notes[0]);
    }
    if (!notesLoading && notes.length === 0 && !isNewNote) {
      setSelectedNote(null);
    }
  }, [notes, notesLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectNote = async (note: NoteItem) => {
    setSelectedNote(note);
    setIsNewNote(false);
    setNoteLoading(true);
    try {
      const detail = await getNoteDetail(note.id);
      setSelectedNote(detail);
      setEditTitle(detail.title);
      setEditCategory(detail.category);
      setEditTagsInput((detail.tags || []).join(', '));
      setEditContent(detail.content || '');
    } catch (err) {
      logger.error('fetch note detail failed', err);
      toast.error('加载笔记详情失败');
      // Fallback to list data
      setEditTitle(note.title);
      setEditCategory(note.category);
      setEditTagsInput((note.tags || []).join(', '));
      setEditContent(note.content || '');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsNewNote(true);
    setEditTitle('');
    setEditCategory(selectedCategory === 'all' ? '' : selectedCategory);
    setEditTagsInput('');
    setEditContent('');
  };

  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error('请输入笔记标题');
      return;
    }
    setSaving(true);
    try {
      const tags = editTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (isNewNote) {
        const payload: CreateNoteRequest = {
          title: editTitle.trim(),
          content: editContent,
          category: editCategory || undefined,
          tags: tags.length > 0 ? tags : undefined,
        };
        const newNote = await createNote(payload);
        setSelectedNote(newNote);
        setIsNewNote(false);
        setEditTitle(newNote.title);
        setEditCategory(newNote.category);
        setEditTagsInput((newNote.tags || []).join(', '));
        setEditContent(newNote.content || '');
        toast.success('笔记已创建');
      } else if (selectedNote) {
        const payload: UpdateNoteRequest = {
          title: editTitle.trim(),
          content: editContent,
          category: editCategory || undefined,
          tags,
        };
        const updated = await updateNote(selectedNote.id, payload);
        setSelectedNote(updated);
        toast.success('笔记已保存');
      }
      void fetchNotes();
      void fetchCategories();
    } catch (err) {
      logger.error('save note failed', err);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (note: NoteItem) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await deleteNote(noteToDelete.id);
      toast.success('笔记已删除');
      setDeleteDialogOpen(false);
      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null);
        setIsNewNote(false);
      }
      setNoteToDelete(null);
      void fetchNotes();
      void fetchCategories();
    } catch (err) {
      logger.error('delete note failed', err);
      toast.error('删除失败');
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSummary = (content: string): string => {
    const clean = content.replace(/\s+/g, ' ').trim();
    return clean.length > 100 ? clean.substring(0, 100) + '...' : clean || '无内容';
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">笔记</h1>
            <p className="text-sm text-muted-foreground">记录学习心得与灵感</p>
          </div>
        </div>
        <Button onClick={handleNewNote}>
          <Plus className="h-4 w-4" />
          新建笔记
        </Button>
      </div>

      {/* 三栏布局 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr_1fr]">
        {/* 左侧边栏：分类 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">分类</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索笔记..."
                className="pl-8"
              />
            </div>

            {/* 排序 */}
            <div className="space-y-1.5">
              <Label className="text-xs">排序方式</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at_desc">更新时间（新→旧）</SelectItem>
                  <SelectItem value="updated_at_asc">更新时间（旧→新）</SelectItem>
                  <SelectItem value="created_at_desc">创建时间（新→旧）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 分类列表 */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-medium text-muted-foreground">笔记分类</p>
              {categoriesLoading ? (
                <div className="space-y-1.5 pt-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      全部笔记
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {notesTotal}
                    </Badge>
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                        selectedCategory === cat.name
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {cat.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {cat.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 中间：笔记列表 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>笔记列表</span>
              <Badge variant="outline">{notesTotal} 篇</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3">
            {notesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => {
                  const isActive = selectedNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => void handleSelectNote(note)}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-medium text-foreground">
                          {note.isPinned && (
                            <Pin className="mr-1 inline h-3.5 w-3.5 text-amber-500" />
                          )}
                          {note.title}
                        </h3>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {getSummary(note.content)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        {note.category && (
                          <Badge variant="secondary" className="text-xs">
                            {note.category}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchKeyword ? '未找到匹配的笔记' : '暂无笔记，点击右上角新建'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：笔记详情/编辑器 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{isNewNote ? '新建笔记' : selectedNote ? '编辑笔记' : '笔记内容'}</span>
              <div className="flex items-center gap-2">
                {selectedNote && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(selectedNote)}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                )}
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto">
            {noteLoading && selectedNote ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-9 w-1/2" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : isNewNote || selectedNote ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="note-title">标题</Label>
                  <Input
                    id="note-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="输入笔记标题"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="note-category">分类</Label>
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger id="note-category">
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="未分类">未分类</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-tags" className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      标签
                    </Label>
                    <Input
                      id="note-tags"
                      value={editTagsInput}
                      onChange={(e) => setEditTagsInput(e.target.value)}
                      placeholder="用逗号分隔"
                    />
                  </div>
                </div>

                {/* 标签展示 */}
                {editTagsInput &&
                  editTagsInput
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {editTagsInput
                        .split(',')
                        .map((t) => t.trim())
                        .filter((t) => t.length > 0)
                        .map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              onClick={() => {
                                const tags = editTagsInput
                                  .split(',')
                                  .map((t) => t.trim())
                                  .filter((t, i) => i !== idx);
                                setEditTagsInput(tags.join(', '));
                              }}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                  )}

                <div className="space-y-2">
                  <Label htmlFor="note-content">内容</Label>
                  <Textarea
                    id="note-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="在这里记录你的想法..."
                    className="min-h-[300px] resize-y"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {editContent.length} 字
                  </p>
                </div>

                {selectedNote && (
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>创建于 {formatDate(selectedNote.createdAt)}</span>
                    <span>更新于 {formatDate(selectedNote.updatedAt)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <StickyNote className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  选择左侧笔记查看内容，或新建一篇
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除笔记「{noteToDelete?.title}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotePage;
