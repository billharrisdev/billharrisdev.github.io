export type Screenshot = { src: string; caption: string; alt: string };
export type Project = {
  id: string;
  name: string;
  category: 'Showcase' | 'Corporate';
  subtitle: string;
  description: string;
  prefixes: string[];
  href?: string;
  status?: string;
  features?: string[];
  screenshots: Screenshot[];
};

// Vite emits these as local, hashed assets. Matching only the site prefix keeps
// multi-part screen names intact and tolerates GreatCall / Greatcall casing.
const images = import.meta.glob<string>('/docs/*.{webp,WEBP}', {
  eager: true, query: '?url', import: 'default'
});

const entries: Omit<Project, 'screenshots'>[] = [
  {
    id: 'frequency-frontier', name: 'Frequency Frontier - Drumming / Beat game',
    category: 'Showcase', subtitle: 'Rhythm, right in your browser.',
    description: 'A browser-based drumming and beat game. Explore the playable project while its screenshot gallery is being prepared.',
    prefixes: ['FrequencyFrontier', 'Frequency-Frontier', 'BrowserGame'],
    href: 'https://billharrisdev.github.io/browsergame'
  },
  {
    id: 'visualizers', name: 'Visualizers', category: 'Showcase',
    subtitle: 'Make the invisible visible.',
    description: 'Interactive visualizers for exploring algorithms. The search gallery illustrates linear search, binary search, A* pathfinding, and Dijkstra’s algorithm.',
    prefixes: ['visualizers'], href: 'https://billharrisdev.github.io/visualizers'
  },
  {
    id: 'daw-gnu', name: 'DAW-GNU', category: 'Showcase', status: 'In development',
    subtitle: 'A recording studio. In a browser.', prefixes: ['DAW'],
    description: 'A browser-based digital audio workstation built in Rust and powered by WebAssembly. Capture and create audio and video, shape your sound, and mix microphone audio into an existing video sequence for recording and reaction-video workflows.',
    features: [
      'Built-in chorus, reverb, flange, echo, distortion, and more.',
      'Rudimentary cabinet and amp-model emulation, including Celestion, 5150, Rectifier, and Peavey-inspired models.',
      'Automatic pitch correction to the closest pitch in a selected scale or mode.',
      'Microphone mixing and video muxing: an OBS-like recording workflow, without built-in streaming uploads.'
    ]
  },
  {
    id: 'greatcall', name: 'GreatCall', category: 'Corporate', status: 'Corporate archive',
    subtitle: 'Connected experiences, from storefront to member services.', prefixes: ['GreatCall'],
    description: 'Worked across GreatCall’s public website, online store, and member portal. Contributions included the online billing section and API support for applications, among other work.',
    features: ['Public website and online store', 'Member portal and online billing', 'API support for applications']
  },
  {
    id: 'proflowers', name: 'ProFlowers', category: 'Corporate', status: 'Archive pending',
    subtitle: 'A storefront retrospective.', prefixes: ['ProFlowers'],
    description: 'An archive gallery for home, product, category, checkout, and order/payment experiences. Additional screenshots and contribution details will be added as they become available.'
  },
  {
    id: 'personal-creations', name: 'Personal Creations', category: 'Corporate', status: 'Archive pending',
    subtitle: 'A storefront retrospective.', prefixes: ['PersonalCreations', 'Personal-Creations'],
    description: 'An archive gallery for home, product, category, checkout, and order/payment experiences. Additional screenshots and contribution details will be added as they become available.'
  }
];

const captions: Record<string, string> = {
  'home-narrow': 'Session · narrow layout', 'home': 'Home page',
  'audiograph': 'Audio graph', 'effects-pitch-shift': 'Effects · pitch shift',
  'inputs': 'Audio inputs', 'output-files': 'Output files', 'phones': 'Phones',
  'activation': 'Activation', '5star-network': '5Star network', 'search': 'Search algorithms',
  'giftoptions': 'Gift options'
};

export const projects: Project[] = entries.map(project => ({
  ...project,
  screenshots: Object.entries(images).flatMap(([path, src]) => {
    const filename = path.split('/').pop()!.replace(/\.webp$/i, '');
    const prefix = project.prefixes.find(value => filename.toLowerCase().startsWith(`${value.toLowerCase()}-`));
    if (!prefix) return [];
    const screen = filename.slice(prefix.length + 1);
    const caption = captions[screen.toLowerCase()] ?? screen.replace(/-/g, ' ');
    return [{ src, caption, alt: `${project.name} — ${caption}` }];
  }).sort((a, b) => {
    const priority = (caption: string) => /^(Home page|Session)/.test(caption) ? 0 : 1;
    return priority(a.caption) - priority(b.caption) || a.caption.localeCompare(b.caption);
  })
})).map(project => ({
  ...project,
  status: project.status === 'Archive pending' && project.screenshots.length ? 'Corporate archive' : project.status
}));
