import React from 'react';
import { MonitorDown, X } from 'lucide-react';

interface Props {
  onClose: () => void;
  canTriggerDirect: boolean;
  onTriggerNativeInstall: () => void;
}

export const DesktopInstallModal: React.FC<Props> = ({
  onClose,
  canTriggerDirect,
  onTriggerNativeInstall,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MonitorDown className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">
              تثبيت التطبيق على سطح المكتب (Desktop POS)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            يمكنك تثبيت نظام <strong>FastRest POS</strong> كتطبيق سطح مكتب مستقل يعمل بملء الشاشة
            ومباشرة من اختصار سطح المكتب على ويندوز عبر متصفح Chrome أو Edge:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-300">
            <li>اضغط على أيقونة التثبيت في شريط العنوان أعلى المتصفح (أو قائمة النقاط الثلاث).</li>
            <li>اختر <strong>تثبيت التطبيق (Install FastRest POS)</strong> أو <strong>Apps &gt; Install this site as an app</strong>.</li>
            <li>سيتم إنشاء اختصار مباشر على سطح المكتب يعمل بدون شريط متصفح.</li>
          </ol>
        </div>

        <div className="flex items-center gap-2 pt-2">
          {canTriggerDirect && (
            <button
              type="button"
              onClick={onTriggerNativeInstall}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
            >
              تثبيت مباشر الآن
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
