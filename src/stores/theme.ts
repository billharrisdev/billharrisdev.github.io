import { writable, type Writable } from 'svelte/store';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  // Default to dark if no saved preference
  return 'dark';
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
