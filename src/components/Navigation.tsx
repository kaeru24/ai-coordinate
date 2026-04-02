'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'ホーム', icon: '🪡' },
  { href: '/register', label: '登録', icon: '📷' },
  { href: '/coordinate', label: 'コーデ', icon: '🪞' },
  { href: '/closet', label: 'クローゼット', icon: '🗂️' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex justify-around items-stretch max-w-sm mx-auto py-1 pb-3">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center flex-1 pt-2 gap-0.5 transition-colors"
              style={{ color: active ? 'var(--ink)' : 'var(--ink3)' }}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: active ? 'var(--ink)' : 'var(--ink3)' }}
              >
                {label}
              </span>
              {active
                ? <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: 'var(--gold)' }} />
                : <span className="w-1 h-1 mt-0.5" />
              }
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
