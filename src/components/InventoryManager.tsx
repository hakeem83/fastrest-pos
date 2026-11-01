import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { formatCurrency, getTodayDateString, StorageService } from '../services/storage';
import { Package, Plus, Trash2 } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  currency: string;
  isRetail?: boolean;
  onRefresh: () => void;
}

export const InventoryManager: React.FC<Props> = ({
  inventory,
  currency,
  onRefresh,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('لحوم ودواجن');
  const [unit, setUnit] = useState('كجم');
  const [stockStr, setStockStr] = useState('10');
  const [costStr, setCostStr] = useState('100');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      code: `ING-00${inventory.length + 1}`,
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim() || 'كجم',
      currentStock: parseFloat(stockStr) || 0,
      minStockAlert: 5,
      unitCost: Math.round((parseFloat(costStr) || 0) * 100),
      lastUpdated: getTodayDateString(),
    };
    StorageService.saveInventory([newItem, ...inventory]);
    setName('');
    onRefresh();
  };

  const handleUpdateStock = (id: string, newStock: number) => {
    const updated = inventory.map((i) =>
      i.id === id ? { ...i, currentStock: Math.max(0, newStock), lastUpdated: getTodayDateString() } : i
    );
    StorageService.saveInventory(updated);
    onRefresh();
  };

  const handleUpdateCost = (id: string, newCostEgp: number) => {
    const updated = inventory.map((i) =>
      i.id === id
        ? { ...i, unitCost: Math.max(0, Math.round(newCostEgp * 100)), lastUpdated: getTodayDateString() }
        : i
    );
    StorageService.saveInventory(updated);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    StorageService.saveInventory(inventory.filter((i) => i.id !== id));
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAdd}
        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs"
      >
        <div className="flex items-center gap-2 font-black text-white text-sm">
          <Package className="w-4 h-4 text-amber-400" />
          <span>إضافة خامة / صنف مخزني جديد (يحدّث تكلفة الوصفات تلقائياً)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الخامة *"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="القسم"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="الوحدة (كجم / قطعة)"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
          <input
            type="number"
            step="0.01"
            value={stockStr}
            onChange={(e) => setStockStr(e.target.value)}
            placeholder="الرصيد الافتتاحي"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
          <input
            type="number"
            step="0.01"
            value={costStr}
            onChange={(e) => setCostStr(e.target.value)}
            placeholder={`تكلفة الوحدة (${currency})`}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة للمخزن</span>
          </button>
        </div>
      </form>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">الكود</th>
                <th className="py-3 px-4">الصنف / الخامة</th>
                <th className="py-3 px-4">القسم</th>
                <th className="py-3 px-4">الرصيد الحالي</th>
                <th className="py-3 px-4">تكلفة الوحدة ({currency})</th>
                <th className="py-3 px-4">إجمالي القيمة</th>
                <th className="py-3 px-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-mono text-slate-400">{item.code}</td>
                  <td className="py-3 px-4 font-bold text-white">{item.name}</td>
                  <td className="py-3 px-4 text-slate-300">{item.category}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={item.currentStock}
                        onChange={(e) =>
                          handleUpdateStock(item.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-white"
                      />
                      <span className="text-slate-400">{item.unit}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      step="0.5"
                      value={(item.unitCost / 100).toFixed(2)}
                      onChange={(e) =>
                        handleUpdateCost(item.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-amber-400"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {formatCurrency(Math.round(item.currentStock * item.unitCost), currency)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
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
    </div>
  );
};
