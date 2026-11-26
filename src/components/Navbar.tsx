import React from 'react';
import type { User } from 'firebase/auth';
import { LogOut, Mail } from 'lucide-react';

export type ActiveTab = 'console' | 'remote' | 'local' | 'cores' | 'android';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab, user, authLoading, onSignIn, onSignOut }) => {
  const navItems: Array<{ id: ActiveTab; label: string; mobileLabel: string }> = [
    { id: 'console', label: 'Console', mobileLabel: 'Jogar' },
    { id: 'remote', label: 'Netplay Online', mobileLabel: 'Online' },
    { id: 'local', label: 'Netplay Local', mobileLabel: 'Local' },
    { id: 'cores', label: 'Núcleos & ROMs', mobileLabel: 'Núcleos/ROMs' },
    { id: 'android', label: 'Android SDK', mobileLabel: 'Android SDK' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#0B0E14]/98 border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-2 sm:px-6">
        <div className="h-11 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
          <button type="button" onClick={() => onSelectTab('console')}
            className="text-base sm:text-lg font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer">
            FamiLink
          </button>

          <div className="flex items-center shrink-0">
            {authLoading ? (
              <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">...</span>
            ) : user ? (
              <button type="button" onClick={onSignOut} title={`${user.email || 'Conta'} · Sair`}
                className="flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3.5 sm:py-2 rounded-lg bg-[#181D29] border border-white/10 text-[10px] sm:text-xs font-medium text-gray-200 whitespace-nowrap cursor-pointer">
                <span className="max-w-[86px] sm:max-w-[140px] truncate">{user.email}</span>
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
              </button>
            ) : (
              <button type="button" onClick={onSignIn}
                className="flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-4 sm:py-2 rounded-lg bg-[#E11D48] text-[10px] sm:text-xs font-semibold text-white whitespace-nowrap cursor-pointer">
                <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-5 lg:gap-7 overflow-x-auto ml-auto">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return <button key={item.id} type="button" onClick={() => onSelectTab(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 pb-1 transition-colors cursor-pointer border-b-2 ${active ? 'text-white border-[#E11D48]' : 'text-gray-400 border-transparent hover:text-gray-200'}`}>
                {item.label}
              </button>;
            })}
          </nav>
        </div>

        <nav className="md:hidden flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1.5 [scrollbar-width:none]">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return <button key={item.id} type="button" onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer ${active ? 'bg-[#E11D48] text-white' : 'text-gray-400 bg-[#12161F]'}`}>
              {item.mobileLabel}
            </button>;
          })}
        </nav>
      </div>
    </header>
  );
};
