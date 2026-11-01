import React, { useState } from 'react';
import { InventoryItem, MenuItem, RecipeIngredient } from '../types';
import { formatCurrency, StorageService } from '../services/storage';
import { ChefHat, Plus, Trash2 } from 'lucide-react';

interface Props {
  menuItems: MenuItem[];
  inventory: InventoryItem[];
  currency: string;
  onRefresh: () => void;
}

export const RecipeCostingModal: React.FC<Props> = ({
  menuItems,
  inventory,
  currency,
  onRefresh,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('المشويات والوجبات');
  const [sellingPriceStr, setSellingPriceStr] = useState('150');
  const [selectedDishId, setSelectedDishId] = useState<string>(menuItems[0]?.id || '');
  const [ingInventoryId, setIngInventoryId] = useState<string>(inventory[0]?.id || '');
  const [ingQtyStr, setIngQtyStr] = useState<string>('0.25');

  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newDish: MenuItem = {
      id: `dish-${Date.now()}`,
      code: `MNU-${100 + menuItems.length + 1}`,
      name: name.trim(),
      category: category.trim(),
      sellingPrice: Math.round((parseFloat(sellingPriceStr) || 0) * 100),
      theoreticalCost: 0,
      active: true,
      ingredients: [],
    };
    StorageService.saveMenuItems([newDish, ...menuItems]);
    setName('');
    setSelectedDishId(newDish.id);
    onRefresh();
  };

  const handleAddIngredientToDish = (e: React.FormEvent) => {
    e.preventDefault();
    const dish = menuItems.find((d) => d.id === selectedDishId);
    const inv = inventory.find((i) => i.id === ingInventoryId);
    const qty = parseFloat(ingQtyStr);
    if (!dish || !inv || isNaN(qty) || qty <= 0) return;

    const existing = dish.ingredients || [];
    const newIng: RecipeIngredient = {
      inventoryItemId: inv.id,
      itemName: inv.name,
      unit: inv.unit,
      qty,
      unitCostSnapshot: inv.unitCost,
    };

    const updatedMenu = menuItems.map((m) =>
      m.id === dish.id ? { ...m, ingredients: [...existing, newIng] } : m
    );
    StorageService.saveMenuItems(updatedMenu);
    onRefresh();
  };

  const handleRemoveIngredient = (dishId: string, idx: number) => {
    const updatedMenu = menuItems.map((m) => {
      if (m.id !== dishId) return m;
      return {
        ...m,
        ingredients: (m.ingredients || []).filter((_, i) => i !== idx),
      };
    });
    StorageService.saveMenuItems(updatedMenu);
    onRefresh();
  };

  const handleDeleteDish = (id: string) => {
    StorageService.saveMenuItems(menuItems.filter((m) => m.id !== id));
    onRefresh();
  };

  const activeDish = menuItems.find((m) => m.id === selectedDishId) || menuItems[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Dishes List & Add New Dish */}
      <div className="lg:col-span-7 space-y-4">
        <form
          onSubmit={handleAddDish}
          className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs"
        >
          <div className="flex items-center gap-2 font-black text-white text-sm">
            <ChefHat className="w-4 h-4 text-amber-400" />
            <span>إضافة طبق جديد إلى المنيو</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم الطبق / الوجبة *"
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="قسم المنيو"
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
            <input
              type="number"
              step="0.5"
              value={sellingPriceStr}
              onChange={(e) => setSellingPriceStr(e.target.value)}
              placeholder={`سعر البيع (${currency})`}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة للمنيو</span>
            </button>
          </div>
        </form>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">الطبق</th>
                <th className="py-3 px-3">سعر البيع</th>
                <th className="py-3 px-3">التكلفة المعيارية</th>
                <th className="py-3 px-3">الربح</th>
                <th className="py-3 px-3">الوصفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {menuItems.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedDishId(m.id)}
                  className={`cursor-pointer transition-colors ${
                    activeDish?.id === m.id ? 'bg-amber-500/10' : 'hover:bg-slate-900/40'
                  }`}
                >
                  <td className="py-3 px-3 font-bold text-white">{m.name}</td>
                  <td className="py-3 px-3 font-mono text-white">
                    {formatCurrency(m.sellingPrice, currency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-400">
                    {formatCurrency(m.theoreticalCost, currency)}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                    {formatCurrency(m.sellingPrice - m.theoreticalCost, currency)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {(m.ingredients || []).length} مكون
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDish(m.id);
                        }}
                        className="p-1 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Recipe Builder for Active Dish */}
      <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4 text-xs">
        {activeDish ? (
          <>
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[11px] text-amber-400 font-bold block">
                مكونات ووصفة الطبق المختار:
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">{activeDish.name}</h4>
            </div>

            <form onSubmit={handleAddIngredientToDish} className="space-y-2.5">
              <div>
                <label className="text-slate-400 block mb-1">اختر الخامة من المخزن:</label>
                <select
                  value={ingInventoryId}
                  onChange={(e) => setIngInventoryId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.unit}) — التكلفة: {formatCurrency(inv.unitCost, currency)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={ingQtyStr}
                  onChange={(e) => setIngQtyStr(e.target.value)}
                  placeholder="الكمية المستهلكة للوجبة"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                />
                <button
                  type="submit"
                  className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  ربط بالوصفة
                </button>
              </div>
            </form>

            <div className="space-y-2 pt-2">
              {(activeDish.ingredients || []).map((ing, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5"
                >
                  <div>
                    <span className="font-bold text-white block">{ing.itemName}</span>
                    <span className="font-mono text-amber-400">
                      {ing.qty} {ing.unit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(activeDish.id, i)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-center py-8">اختر طبقاً لعرض وتعديل وصفته</p>
        )}
      </div>
    </div>
  );
};
