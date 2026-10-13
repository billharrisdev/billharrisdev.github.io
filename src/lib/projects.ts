import { createProjects } from './projectData';

export type { Project, Screenshot } from './projectData';

// Vite emits these as local, hashed assets.
const images = import.meta.glob<string>('/docs/*.{webp,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const projects = createProjects(images);
