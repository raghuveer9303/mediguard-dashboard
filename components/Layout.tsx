import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LineChart, 
  Menu, 
  X,
  HeartPulse,
  Wifi,
  WifiOff,
  Settings
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  systemHealthy: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, systemHealthy }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/' },
    { label: 'Analytics', icon: LineChart, path: '/analytics' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col justify-between shadow-xl
      `}>
        <div>
          <div className="p-6 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">MediGuard</span>
            </div>
            <button onClick={toggleSidebar} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          <nav className="mt-6 px-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${location.pathname === item.path 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
            {systemHealthy ? (
              <div className="bg-green-500/20 p-1.5 rounded-full">
                <Wifi className="w-4 h-4 text-green-500" />
              </div>
            ) : (
              <div className="bg-red-500/20 p-1.5 rounded-full">
                <WifiOff className="w-4 h-4 text-red-500" />
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 font-medium">System Status</p>
              <p className={`text-sm font-bold ${systemHealthy ? 'text-green-400' : 'text-red-400'}`}>
                {systemHealthy ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
             <HeartPulse className="w-6 h-6 text-blue-600" />
             <span className="font-bold text-slate-900">MediGuard</span>
          </div>
          <button onClick={toggleSidebar} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md">
            <Menu size={24} />
          </button>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;