import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  HardDrive,
  Laptop,
  MonitorDown,
  ShieldCheck,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import { StorageService } from '../services/storage';

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
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleExportLocalBackup = () => {
    try {
      StorageService.exportBusinessBackupFile();
      setStatusMsg({
        type: 'ok',
        text: 'تم حفظ ملف النسخة الاحتياطية (.JSON) على جهاز الويندوز بنجاح! يمكنك نقله على فلاشة USB لأي جهاز آخر.',
      });
    } catch {
      setStatusMsg({
        type: 'err',
        text: 'تعذر حفظ النسخة الاحتياطية.',
      });
    }
  };

  const handleImportLocalBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = StorageService.restoreCurrentBusinessFromBackupJSON(String(reader.result || ''));
      if (ok) {
        setStatusMsg({
          type: 'ok',
          text: 'تم استرجاع النسخة الاحتياطية بنجاح! سيتم تحديث الشاشة تلقائياً...',
        });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setStatusMsg({
          type: 'err',
          text: 'ملف النسخة الاحتياطية غير صالح.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MonitorDown className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-black text-white">
                تثبيت برنامج الكاشير الأوفلاين على جميع أنظمة ويندوز (Windows 7 / 8 / 10 / 11)
              </h3>
              <p className="text-[11px] text-slate-400">
                يعمل بدون إنترنت 100% وبدون الحاجة لتثبيت Node.js أو Python أو قواعد بيانات معقدة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* شريط حالة جاهزية الأوفلاين */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-black text-emerald-300">ذاكرة الكاش الأوفلاين</div>
              <div className="text-[11px] text-slate-300">مفعلة تلقائياً (PWA Service Worker)</div>
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-black text-amber-300">التخزين الفوري بالفرع</div>
              <div className="text-[11px] text-slate-300">قاعدة بيانات محلية على الهارد</div>
            </div>
          </div>
          <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <div className="font-black text-sky-300">انقطاع الإنترنت</div>
              <div className="text-[11px] text-slate-300">لا يتوقف البيع أو الطباعة لحظة</div>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              statusMsg.type === 'ok'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* ويندوز 10 و 11 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-black">
              <Laptop className="w-4 h-4" />
              <span>أجهزة Windows 10 و Windows 11</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed text-[11px]">
              <li>افتح رابط الفرع مرة واحدة فقط عبر متصفح <strong>Chrome</strong> أو <strong>Microsoft Edge</strong> (باستخدام نقطة اتصال موبايل لمدة دقيقة).</li>
              <li>اضغط زر <strong>«تثبيت مباشر الآن»</strong> بالأسفل أو أيقونة الشاشة في شريط العنوان أعلى المتصفح.</li>
              <li>تظهر أيقونة <strong>FastRest POS</strong> على سطح المكتب وشريط المهام، وتفتح في نافذة مستقلة كاملة بدون إنترنت نهائياً.</li>
            </ol>
          </div>

          {/* ويندوز 7 و 8.1 للأجهزة القديمة في المحلات */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-black">
              <Laptop className="w-4 h-4" />
              <span>أجهزة الكاشير القديمة Windows 7 / 8.1</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed text-[11px]">
              <li>يعمل بكفاءة كاملة على <strong>Google Chrome (إصدار 109)</strong> أو <strong>Microsoft Edge</strong> أو متصفح <strong>Supermium</strong> لويندوز 7.</li>
              <li>من قائمة المتصفح (النقاط الثلاث) اختر: <strong>المزيد من الأدوات &gt; إنشاء اختصار (Create Shortcut)</strong> وحدد خيار <strong>الفتح كنافذة (Open as window)</strong>.</li>
              <li>يتم حفظ البرنامج بالكامل داخل الجهاز ويعمل أوفلاين بدون أي بطء حتى على الأجهزة ذات الرامات الضعيفة (2GB RAM).</li>
            </ol>
          </div>
        </div>

        {/* قسم النسخ الاحتياطي السريع عبر الفلاشة USB للأجهزة الأوفلاين */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
          <div className="font-black text-white">
            نقل البيانات والنسخ الاحتياطي الأوفلاين عبر فلاشة USB (بدون إنترنت):
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            إذا كان المحل بدون إنترنت تماماً، يمكنك في أي وقت حفظ ملف النسخة الاحتياطية (<strong>.JSON</strong>) على فلاشة USB، أو استرجاعه على أي جهاز ويندوز آخر بضغطة زر:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleExportLocalBackup}
              className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>حفظ نسخة احتياطية على الجهاز / USB (.JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>استرجاع نسخة من الجهاز / USB (.JSON)</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportLocalBackup}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {canTriggerDirect && (
            <button
              type="button"
              onClick={onTriggerNativeInstall}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
            >
              تثبيت مباشر كبرنامج سطح مكتب الآن
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

