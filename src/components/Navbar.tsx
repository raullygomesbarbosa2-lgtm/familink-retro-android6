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

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  user,
  authLoading,
  onSignIn,
  onSignOut,
}) => {
  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'console', label: 'Console' },
    { id: 'remote', label: 'Netplay Online' },
    { id: 'local', label: 'Netplay Local' },
    { id: 'cores', label: 'Núcleos & ROMs' },
    { id: 'android', label: 'Android SDK' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('console')}
          className="text-lg font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          FamiLink
        </button>

        <nav className="flex items-center gap-5 sm:gap-7 overflow-x-auto">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 pb-1 transition-colors cursor-pointer border-b-2 ${
                  active
                    ? 'text-white border-[#E11D48]'
                    : 'text-gray-400 border-transparent hover:text-gray-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          {authLoading ? (
            <span className="text-xs text-gray-400 whitespace-nowrap">Verificando...</span>
          ) : user ? (
            <button
              type="button"
              onClick={onSignOut}
              title={user.email || 'Sair da conta'}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#181D29] hover:bg-[#1F2636] border border-white/10 text-xs font-medium text-gray-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="max-w-[140px] truncate">{user.email}</span>
              <LogOut className="w-3.5 h-3.5 text-gray-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Entrar com E-mail</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
