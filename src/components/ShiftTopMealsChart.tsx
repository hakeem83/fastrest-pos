import React, { useMemo, useState } from 'react';
import { SaleOrder } from '../types';
import { formatCurrency } from '../services/storage';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, BarChart3, Flame, TrendingUp, Utensils } from 'lucide-react';

interface Props {
  orders: SaleOrder[];
  currency: string;
}

interface MealMetric {
  menuItemId: string;
  name: string;
  shortName: string;
  qtySold: number;
  revenueMajor: number;
  revenueMinor: number;
  costMinor: number;
  profitMinor: number;
  ordersCount: number;
}

const BAR_COLORS = [
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#38bdf8', // sky-400
  '#a855f7', // purple-500
  '#f43f5e', // rose-500
  '#eab308', // yellow-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
];

export const ShiftTopMealsChart: React.FC<Props> = ({ orders, currency }) => {
  const [metricMode, setMetricMode] = useState<'qty' | 'revenue'>('qty');

  const { mealMetrics, totalDishesSold, totalShiftRevenue, topMeal } = useMemo(() => {
    const map = new Map<string, MealMetric>();
    let dishesCount = 0;
    let revenueSum = 0;

    for (const order of orders) {
      revenueSum += order.totalAmount;
      for (const line of order.lines) {
        dishesCount += line.qty;
        const key = line.menuItemId || line.menuItemName;
        const existing = map.get(key);
        if (existing) {
          existing.qtySold += line.qty;
          existing.revenueMinor += line.totalPrice;
          existing.revenueMajor = Number((existing.revenueMinor / 100).toFixed(2));
          existing.costMinor += line.totalTheoreticalCost;
          existing.profitMinor = existing.revenueMinor - existing.costMinor;
          existing.ordersCount += 1;
        } else {
          const shortName =
            line.menuItemName.length > 22
              ? `${line.menuItemName.slice(0, 20)}…`
              : line.menuItemName;
          map.set(key, {
            menuItemId: key,
            name: line.menuItemName,
            shortName,
            qtySold: line.qty,
            revenueMinor: line.totalPrice,
            revenueMajor: Number((line.totalPrice / 100).toFixed(2)),
            costMinor: line.totalTheoreticalCost,
            profitMinor: line.totalPrice - line.totalTheoreticalCost,
            ordersCount: 1,
          });
        }
      }
    }

    const list = Array.from(map.values()).sort((a, b) =>
      metricMode === 'qty' ? b.qtySold - a.qtySold : b.revenueMinor - a.revenueMinor
    );

    return {
      mealMetrics: list.slice(0, 8),
      totalDishesSold: dishesCount,
      totalShiftRevenue: revenueSum,
      topMeal: list[0] || null,
    };
  }, [orders, metricMode]);

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
      {/* Top Header & Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>لوحة تحليلات الوجبات الأكثر مبيعاً بالوردية</span>
              <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
                مباشر · Recharts
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              تحليل فوري لحركة أصناف المنيو المباعة خلال الوردية الحالية حسب الكمية أو الإيرادات
            </p>
          </div>
        </div>

        {/* Toggle Metric */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMetricMode('qty')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              metricMode === 'qty'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            حسب الكمية المباعة (عدد الوجبات)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('revenue')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              metricMode === 'revenue'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            حسب قيمة المبيعات ({currency})
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-slate-400 block">الوجبة رقم #1 بالوردية</span>
            <strong className="text-xs sm:text-sm font-black text-white truncate block">
              {topMeal ? topMeal.name : '—'}
            </strong>
            {topMeal && (
              <span className="text-[11px] text-amber-400 font-mono font-bold">
                {topMeal.qtySold} وجبة · {formatCurrency(topMeal.revenueMinor, currency)}
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">إجمالي عدد الأطباق المباعة</span>
            <strong className="text-lg font-black font-mono text-white">
              {totalDishesSold} <span className="text-xs font-normal text-slate-400">طبق / صنف</span>
            </strong>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">صافي إيرادات فواتير الوردية</span>
            <strong className="text-lg font-black font-mono text-emerald-400">
              {formatCurrency(totalShiftRevenue, currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Recharts Chart + Ranking List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        {/* BarChart Container */}
        <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mealMetrics}
              margin={{ top: 12, right: 16, left: 8, bottom: 28 }}
              barSize={34}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="shortName"
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                interval={0}
                angle={-12}
                textAnchor="end"
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as MealMetric;
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 text-right">
                      <div className="font-black text-white border-b border-slate-800 pb-1">
                        {item.name}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">الكمية المباعة:</span>
                        <strong className="font-mono text-amber-400">{item.qtySold} وجبة</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">إجمالي المبيعات:</span>
                        <strong className="font-mono text-emerald-400">
                          {formatCurrency(item.revenueMinor, currency)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">التكلفة المعيارية:</span>
                        <span className="font-mono text-slate-300">
                          {formatCurrency(item.costMinor, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1">
                        <span className="text-slate-400">مجمل الربح:</span>
                        <strong className="font-mono text-sky-400">
                          {formatCurrency(item.profitMinor, currency)}
                        </strong>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey={metricMode === 'qty' ? 'qtySold' : 'revenueMajor'}
                radius={[8, 8, 0, 0]}
              >
                {mealMetrics.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.menuItemId}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right Side Detailed Breakdown */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              ترتيب الأصناف بالوردية
            </span>
            <span className="text-[11px] text-slate-500">الكمية / القيمة</span>
          </div>
          {mealMetrics.map((item, idx) => (
            <div
              key={item.menuItemId}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/60 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] font-black text-slate-950 shrink-0"
                  style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                >
                  {idx + 1}
                </span>
                <span className="font-bold text-slate-200 truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              <div className="text-left shrink-0">
                <span className="font-mono font-black text-amber-400 block">
                  {item.qtySold} طبق
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {formatCurrency(item.revenueMinor, currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
