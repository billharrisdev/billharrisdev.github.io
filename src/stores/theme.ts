import { writable, type Writable } from 'svelte/store';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' as const : 'light' as const;
}

export const theme: Writable<Theme> = writable<Theme>(getInitialTheme());

export function toggleTheme(): void {
  theme.update((t: Theme) => (t === 'dark' ? 'light' : 'dark'));
}

// reflect to document + persist
if (typeof document !== 'undefined') {
  theme.subscribe((t: Theme) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch {}
  });
}
