import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/utils/pwa';

const STORAGE_KEY = 'pwa_install_prompt_dismissed';

interface PWAInstallToastProps {
  onShowGuide?: () => void;
}

const PWAInstallToast = ({ onShowGuide }: PWAInstallToastProps) => {
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInstalled) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, 1000);

    const autoHide = setTimeout(() => {
      setVisible(false);
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHide);
    };
  }, [isInstalled]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleInstall = async () => {
    if (canInstall) {
      const ok = await install();
      if (ok) {
        setVisible(false);
      } else if (onShowGuide) {
        onShowGuide();
        setVisible(false);
      }
    } else if (onShowGuide) {
      onShowGuide();
      setVisible(false);
    }
  };

  if (!visible || isInstalled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm opacity-100 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg shadow-black/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
          <Download className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">可安装到桌面</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            安装为桌面应用，独立窗口运行，使用更方便
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={handleInstall} className="h-7 px-3 text-xs">
              立即安装
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              不再提示
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="关闭"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
};

export { PWAInstallToast };
