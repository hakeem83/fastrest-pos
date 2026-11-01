import React, { useState } from 'react';
import { AccountCategory } from '../types';
import { StorageService } from '../services/storage';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  categories: AccountCategory[];
  onRefresh: () => void;
}

export const MasterDataModal: React.FC<Props> = ({ categories, onRefresh }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'receipt'>('expense');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newCat: AccountCategory = {
      id: `cat-${Date.now()}`,
      code: code.trim() || `ACC-${categories.length + 101}`,
      name: name.trim(),
      type,
    };
    StorageService.saveCategories([...categories, newCat]);
    setCode('');
    setName('');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    StorageService.saveCategories(categories.filter((c) => c.id !== id));
    onRefresh();
  };

  return (
    <div className="space-y-4 text-xs">
      <form
        onSubmit={handleAdd}
        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3"
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="كود الحساب (مثال EXP-109)"
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
        />
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم بند الحساب *"
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'expense' | 'receipt')}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
        >
          <option value="expense">مصروفات (سند صرف)</option>
          <option value="receipt">مقبوضات (سند قبض)</option>
        </select>
        <button
          type="submit"
          className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة بند</span>
        </button>
      </form>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">الكود</th>
              <th className="py-3 px-4">اسم البند</th>
              <th className="py-3 px-4">النوع</th>
              <th className="py-3 px-4">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="py-2.5 px-4 font-mono text-amber-400">{c.code}</td>
                <td className="py-2.5 px-4 font-bold text-white">{c.name}</td>
                <td className="py-2.5 px-4">
                  {c.type === 'expense' ? 'مصروفات' : 'مقبوضات'}
                </td>
                <td className="py-2.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
