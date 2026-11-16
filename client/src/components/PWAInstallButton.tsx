import { useState } from 'react';
import {
  Download,
  Check,
  Copy,
  CheckCheck,
  MonitorPlay,
  Chrome,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/utils/pwa';
import { resolveAppUrl } from '@lark-apaas/client-toolkit/utils/resolveAppUrl';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const InstallGuideDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = resolveAppUrl('/');
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">安装到桌面</DialogTitle>
          <DialogDescription>
            将系统安装为桌面应用，独立窗口运行，像普通软件一样从任务栏打开。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-3">
              <MonitorPlay className="size-5" />
              <span>推荐方案：Edge 浏览器一键安装（最稳）</span>
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-cyan-400 font-semibold shrink-0">1.</span>
                <span>点击下方「复制应用链接」按钮，复制系统网址</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-semibold shrink-0">2.</span>
                <span>打开电脑自带的 <strong className="text-foreground">Microsoft Edge</strong> 浏览器（Win10/Win11 自带，任务栏蓝绿色波浪图标）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-semibold shrink-0">3.</span>
                <span>在 Edge 地址栏粘贴网址并回车打开</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-semibold shrink-0">4.</span>
                <span>Edge 地址栏最右侧会出现「安装应用」图标（显示器 + 向下箭头），点击它</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-semibold shrink-0">5.</span>
                <span>在弹出的确认框中点击「安装」</span>
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-semibold shrink-0">6.</span>
                <span>安装完成后桌面会出现快捷方式，双击即以独立小窗口打开</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-blue-400 font-semibold mb-3">
              <Chrome className="size-5" />
              <span>备用方案：Chrome 浏览器</span>
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-blue-400 font-semibold shrink-0">1.</span>
                <span>复制下方链接，用 Chrome 浏览器打开</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 font-semibold shrink-0">2.</span>
                <span>地址栏右侧会出现安装图标，点击即可安装</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-dashed p-4">
            <div className="text-sm font-semibold mb-2">💡 手动创建快捷方式（任何浏览器都行）</div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• <strong className="text-foreground">Edge：</strong>右上角三个点 → 应用 → 将此站点作为应用安装 → 勾选「在窗口中打开」</li>
              <li>• <strong className="text-foreground">Chrome：</strong>右上角三个点 → 更多工具 → 创建快捷方式 → 勾选「在窗口中打开」</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleCopyLink} variant="default" className="gap-2 flex-1 min-w-[140px]">
              {copied ? (
                <>
                  <CheckCheck className="size-4" />
                  已复制链接
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  复制应用链接
                </>
              )}
            </Button>
            <UniversalLink
              to="microsoft-edge:__URL__"
              onClick={(e) => {
                e.preventDefault();
                const url = resolveAppUrl('/');
                // eslint-disable-next-line no-restricted-syntax
                window.location.href = `microsoft-edge:${url}`;
              }}
              className="flex-1 min-w-[140px]"
            >
              <Button variant="outline" className="gap-2 w-full">
                <ExternalLink className="size-4" />
                打开 Edge 浏览器
              </Button>
            </UniversalLink>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3">
            <p>安装后效果：独立窗口运行、任务栏图标、桌面快捷方式、无浏览器地址栏干扰。</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PWAInstallButton = ({
  guideOpen,
  onGuideOpenChange,
}: {
  guideOpen?: boolean;
  onGuideOpenChange?: (open: boolean) => void;
}) => {
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const [localOpen, setLocalOpen] = useState(false);

  const open = guideOpen !== undefined ? guideOpen : localOpen;
  const setOpen = onGuideOpenChange || setLocalOpen;

  const handleClick = async () => {
    if (canInstall) {
      await install();
    } else {
      setOpen(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
        <Check className="size-3.5" />
        <span className="hidden sm:inline">已安装为桌面应用</span>
        <span className="sm:hidden">已安装</span>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="default"
        size="default"
        onClick={handleClick}
        className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 h-10 px-5 font-medium"
      >
        <Download className="size-4.5" />
        <span>安装到桌面</span>
      </Button>
      <InstallGuideDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export { PWAInstallButton, InstallGuideDialog };
