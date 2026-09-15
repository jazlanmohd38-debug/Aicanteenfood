import { useState, type ReactNode } from 'react';
import { LayoutDashboard, UtensilsCrossed, ClipboardList, BrainCircuit, Menu, X, ChefHat } from 'lucide-react';

export type PageKey = 'dashboard' | 'food-items' | 'sales-data' | 'prediction';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'food-items', label: 'Food Items', icon: UtensilsCrossed },
  { key: 'sales-data', label: 'Sales Data', icon: ClipboardList },
  { key: 'prediction', label: 'AI Prediction', icon: BrainCircuit },
];

interface LayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 fixed inset-y-0 left-0 z-30">
        <SidebarContent currentPage={currentPage} onNavigate={handleNav} />
      </aside>

      {/* Sidebar - Mobile */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 md:hidden flex flex-col transition-transform duration-300">
            <SidebarContent currentPage={currentPage} onNavigate={handleNav} />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-amber-400" />
            <span className="font-semibold text-lg">AI Canteen</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  currentPage,
  onNavigate,
}: {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-700">
        <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center">
          <ChefHat className="w-6 h-6 text-slate-900" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">AI Canteen</h1>
          <p className="text-xs text-slate-400">Demand Predictor</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">System Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-400">Active</span>
          </div>
        </div>
      </div>
    </>
  );
}
