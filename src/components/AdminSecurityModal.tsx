import React, { useRef, useState } from 'react';
import { RestaurantSettings } from '../types';
import { StorageService } from '../services/storage';
import { CloudSyncService } from '../services/firebaseSync';
import {
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Download,
  FileSpreadsheet,
  HardDriveDownload,
  RefreshCw,
  Save,
  Upload,
} from 'lucide-react';

interface Props {
  settings: RestaurantSettings;
  onSettingsUpdated: (newSettings: RestaurantSettings) => void;
  onRefresh?: () => void;
}

export const AdminSecurityModal: React.FC<Props> = ({
  settings,
  onSettingsUpdated,
  onRefresh,
}) => {
  const [restaurantName, setRestaurantName] = useState(settings.restaurantName);
  const [branchName, setBranchName] = useState(settings.branchName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [taxNumber, setTaxNumber] = useState(settings.taxNumber || '');
  const [footerNote, setFooterNote] = useState(settings.footerNote);
  const [adminPin, setAdminPin] = useState(settings.adminPin || '1234');
  const [savedMsg, setSavedMsg] = useState('');
  const [backupStatus, setBackupStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RestaurantSettings = {
      ...settings,
      restaurantName: restaurantName.trim(),
      branchName: branchName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim(),
      footerNote: footerNote.trim(),
      adminPin: adminPin.trim() || '1234',
    };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setSavedMsg('تم حفظ إعدادات الهوية والطباعة ورمز PIN بنجاح');
    setTimeout(() => setSavedMsg(''), 3500);
  };

  const handleDownloadLocalJsonBackup = () => {
    try {
      StorageService.exportBusinessBackupFile();
      setBackupStatus({
        type: 'success',
        text: 'تم تحميل ملف النسخة الاحتياطية المحلية (.JSON) بنجاح على هذا الجهاز. يمكنك حفظه على فلاشة USB أو قرص خارجي.',
      });
    } catch {
      setBackupStatus({
        type: 'error',
        text: 'حدث خطأ أثناء تصدير النسخة الاحتياطية المحلية.',
      });
    }
  };

  const handleRestoreLocalJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const ok = StorageService.restoreCurrentBusinessFromBackupJSON(content);
      if (ok) {
        const refreshedSettings = StorageService.getSettings();
        setRestaurantName(refreshedSettings.restaurantName);
        setBranchName(refreshedSettings.branchName);
        setPhone(refreshedSettings.phone);
        setAddress(refreshedSettings.address);
        setTaxNumber(refreshedSettings.taxNumber || '');
        setFooterNote(refreshedSettings.footerNote);
        setAdminPin(refreshedSettings.adminPin || '1234');
        onSettingsUpdated(refreshedSettings);
        onRefresh?.();
        setBackupStatus({
          type: 'success',
          text: 'تم استرجاع كافة بيانات الفرع (الفواتير، الورديات، الأصناف، المخزون، الحسابات) من ملف النسخة الاحتياطية بنجاح!',
        });
      } else {
        setBackupStatus({
          type: 'error',
          text: 'ملف النسخة الاحتياطية غير صالح أو تالف. تأكد من اختيار ملف .JSON صحيح تم تصديره من النظام.',
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleCloudPushBranch = async () => {
    setIsSyncingCloud(true);
    setBackupStatus(null);
    try {
      await CloudSyncService.syncActiveBusinessToCloud();
      setBackupStatus({
        type: 'success',
        text: 'تم رفع ومزامنة النسخة الاحتياطية لهذا الفرع إلى قاعدة البيانات السحابية بنجاح.',
      });
    } catch (err) {
      setBackupStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر الاتصال بالسحابة حالياً. تأكد من اتصال الإنترنت.',
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleCloudPullBranch = async () => {
    const bizId = settings.businessId || StorageService.getActiveBusinessId();
    setIsSyncingCloud(true);
    setBackupStatus(null);
    try {
      const cloudDoc = await CloudSyncService.pullSingleCloudBranchById(bizId, true);
      if (cloudDoc) {
        const refreshedSettings = StorageService.getSettings();
        onSettingsUpdated(refreshedSettings);
        onRefresh?.();
        setBackupStatus({
          type: 'success',
          text: 'تم استرجاع وتحديث بيانات هذا الفرع من النسخة السحابية بنجاح!',
        });
      } else {
        setBackupStatus({
          type: 'error',
          text: 'لم يتم العثور على نسخة سحابية محفوظة لهذا الفرع أو لم يتم تسجيل الدخول السحابي.',
        });
      }
    } catch (err) {
      setBackupStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر الاتصال بالسحابة حالياً.',
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <form
        onSubmit={handleSave}
        className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs"
      >
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-black text-white">إعدادات الهوية والطباعة ورمز الإدارة (PIN)</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            تظهر هذه البيانات على الفواتير المطبوعة الحرارية والقياسية الخاصة بهذا الفرع.
          </p>
        </div>

        {savedMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-300 block mb-1">اسم المطعم / المنشأة:</label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">اسم الفرع:</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">رقم الهاتف:</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">السجل التجاري / الضريبي:</label>
            <input
              type="text"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="font-bold text-slate-300 block mb-1">العنوان التفصيلي:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">رسالة تذييل الفاتورة:</label>
            <input
              type="text"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">رمز دخول الإدارة السري (PIN):</label>
            <input
              type="text"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>حفظ الإعدادات</span>
        </button>
      </form>

      {/* مركز النسخ الاحتياطي المحلي والسحابي واسترجاع بيانات الفرع */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                مركز النسخ الاحتياطي واسترجاع بيانات الفرع (أوفلاين وسحابي)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                احفظ نسخة كاملة من بيانات الفرع على جهاز الويندوز أو فلاشة USB بدون إنترنت، أو استرجعها بضغطة زر في أي وقت.
              </p>
            </div>
          </div>
        </div>

        {backupStatus && (
          <div
            className={`p-3 rounded-xl border font-bold ${
              backupStatus.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {backupStatus.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. تحميل نسخة احتياطية محلية JSON */}
          <button
            type="button"
            onClick={handleDownloadLocalJsonBackup}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center gap-3 text-right transition cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs">
                حفظ نسخة احتياطية محلية (.JSON)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                يعمل 100% أوفلاين — يحفظ كل الفواتير والمخزون والحسابات في ملف على الكمبيوتر أو الفلاشة
              </div>
            </div>
          </button>

          {/* 2. استرجاع نسخة احتياطية محلية JSON */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center gap-3 text-right transition cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs">
                استرجاع البيانات من ملف (.JSON)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                يعمل 100% أوفلاين — اختر ملف نسخة احتياطية من الجهاز أو الفلاشة لاستعادة الفرع بالكامل
              </div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleRestoreLocalJsonFile}
            className="hidden"
          />

          {/* 3. تصدير شيت إكسيل محاسبي شامل */}
          <button
            type="button"
            onClick={() => StorageService.exportToExcel()}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center gap-3 text-right transition cursor-pointer"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs">
                تصدير الدفاتر المحاسبية (.XLSX Excel)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                ملف إكسيل متعدد الشيتات (الفواتير، الورديات، السندات، المخزون، العملاء، الموردين)
              </div>
            </div>
          </button>

          {/* 4. مزامنة واسترجاع سحابي للفرع */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between gap-2">
            <div className="text-xs font-black text-white flex items-center justify-between">
              <span>النسخ والاسترجاع السحابي للفرع (عند توفر إنترنت)</span>
              {isSyncingCloud && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSyncingCloud}
                onClick={handleCloudPushBranch}
                className="flex-1 py-2 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>رفع للسحابة الآن</span>
              </button>
              <button
                type="button"
                disabled={isSyncingCloud}
                onClick={handleCloudPullBranch}
                className="flex-1 py-2 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                <span>استرجاع من السحابة</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

