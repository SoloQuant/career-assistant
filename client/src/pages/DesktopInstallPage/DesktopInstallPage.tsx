import { useState } from 'react';
import {
  Download,
  Copy,
  CheckCheck,
  MonitorPlay,
  Chrome,
  MonitorSmartphone,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInstallPrompt } from '@/utils/pwa';
import { resolveAppUrl } from '@lark-apaas/client-toolkit/utils/resolveAppUrl';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const DesktopInstallPage = () => {
  const { canInstall, isInstalled, install } = useInstallPrompt();
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="size-6 text-cyan-400" />
          桌面安装指南
        </h1>
        <p className="text-muted-foreground">
          将职业发展助手安装到桌面，像普通软件一样独立运行，使用更高效。
        </p>
      </div>

      {isInstalled && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="size-5" />
              已安装为桌面应用
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            您当前正在以桌面应用模式运行，无需重复安装。可以从桌面快捷方式或任务栏图标快速打开。
          </CardContent>
        </Card>
      )}

      {canInstall && !isInstalled && (
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">一键安装</CardTitle>
            <CardDescription>
              检测到您的浏览器支持一键安装，点击下方按钮立即安装。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={install} size="lg" className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/30">
              <Download className="size-5" />
              立即安装到桌面
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MonitorPlay className="size-5 text-cyan-400" />
              Edge 浏览器安装
            </CardTitle>
            <CardDescription>推荐使用，Windows 10/11 自带</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium text-foreground">方法一：地址栏图标（最快）</div>
              <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
                <li>用 Edge 浏览器打开本系统</li>
                <li>点击地址栏最右侧的「安装应用」图标 <span className="text-foreground">🖥️⬇</span></li>
                <li>在弹窗中点击「安装」</li>
              </ol>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">方法二：菜单路径</div>
              <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
                <li>点击浏览器右上角「···」（或按 Alt+F）</li>
                <li>选择「应用」→「将此站点作为应用安装」</li>
                <li>勾选「在窗口中打开」，点击安装</li>
              </ol>
            </div>
            <UniversalLink
              to="https://www.microsoft.com/edge"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5 w-full">
                <ExternalLink className="size-3.5" />
                下载 Edge 浏览器
              </Button>
            </UniversalLink>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Chrome className="size-5 text-blue-400" />
              Chrome 浏览器安装
            </CardTitle>
            <CardDescription>主流浏览器，操作类似</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium text-foreground">方法一：地址栏图标</div>
              <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
                <li>用 Chrome 浏览器打开本系统</li>
                <li>点击地址栏右侧的「安装」图标</li>
                <li>在弹窗中点击「安装」</li>
              </ol>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">方法二：菜单路径</div>
              <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
                <li>点击浏览器右上角「⋮」三个点</li>
                <li>选择「保存和共享」→「安装页面为应用」</li>
                <li>点击「安装」完成</li>
              </ol>
            </div>
            <UniversalLink
              to="https://www.google.com/chrome"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5 w-full">
                <ExternalLink className="size-3.5" />
                下载 Chrome 浏览器
              </Button>
            </UniversalLink>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Copy className="size-5 text-foreground" />
            复制应用链接
          </CardTitle>
          <CardDescription>
            复制下方链接，在 Edge 或 Chrome 浏览器中粘贴打开
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono break-all">
              {typeof window !== 'undefined' ? resolveAppUrl('/') : ''}
            </div>
            <Button onClick={handleCopyLink} variant="default" className="gap-2 shrink-0">
              {copied ? (
                <>
                  <CheckCheck className="size-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  复制
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorSmartphone className="size-5 text-foreground" />
            安装后的效果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl mb-2">🪟</div>
              <div className="text-sm font-medium">独立窗口</div>
              <div className="text-xs text-muted-foreground mt-1">
                无浏览器地址栏，专注使用
              </div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl mb-2">📌</div>
              <div className="text-sm font-medium">任务栏图标</div>
              <div className="text-xs text-muted-foreground mt-1">
                固定到任务栏，一键打开
              </div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl mb-2">🖥️</div>
              <div className="text-sm font-medium">桌面快捷方式</div>
              <div className="text-xs text-muted-foreground mt-1">
                双击桌面图标快速启动
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="size-5 text-foreground" />
            常见问题
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="font-medium text-foreground">Q：找不到安装按钮怎么办？</div>
            <p className="text-muted-foreground mt-1">
              A：请检查是否使用的是 Microsoft Edge 或 Google Chrome 浏览器。部分国产浏览器（如豆包浏览器、360浏览器等）可能不支持 PWA 安装功能，建议换用 Edge 或 Chrome。
            </p>
          </div>
          <div>
            <div className="font-medium text-foreground">Q：Edge 地址栏没有安装图标？</div>
            <p className="text-muted-foreground mt-1">
              A：请将 Edge 浏览器更新到最新版本，或尝试通过菜单路径：右上角「···」→「应用」→「将此站点作为应用安装」。
            </p>
          </div>
          <div>
            <div className="font-medium text-foreground">Q：安装后怎么卸载？</div>
            <p className="text-muted-foreground mt-1">
              A：在应用窗口右上角点击「···」→「卸载应用」，或在 Windows 设置的「应用和功能」中找到并卸载。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesktopInstallPage;
