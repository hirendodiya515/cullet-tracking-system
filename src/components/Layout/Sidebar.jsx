import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, PenSquare, Settings, LogOut } from 'lucide-react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const { userRole, currentUser } = useAuth();
  
  const handleLogout = async () => {
    await signOut(auth);
  };

  const menuItems = [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: ['Admin', 'Engineer'],
    },
    {
      title: 'Data Entry',
      path: '/entry',
      icon: <PenSquare className="w-5 h-5" />,
      roles: ['Admin', 'Engineer', 'Operator'],
    },
    {
      title: 'Layout Setup',
      path: '/settings',
      icon: <Settings className="w-5 h-5" />,
      roles: ['Admin'],
    },
    {
      title: 'Form Setup',
      path: '/form-setup',
      icon: <PenSquare className="w-5 h-5" />, // Or another icon like FileSliders
      roles: ['Admin'],
    }
  ];

  const visibleMenu = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col hidden md:flex">
      <div className="h-[72px] flex items-center px-6 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-extrabold text-xl">C</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white tracking-wide text-[15px] leading-tight flex flex-col justify-center">
              <span>Cullet Tracking</span>
              <span className="text-indigo-400">System</span>
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {visibleMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              )
            }
          >
            {item.icon}
            {item.title}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-slate-800/50 rounded-xl">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium text-white">
            {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentUser?.email || 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate">{userRole}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
