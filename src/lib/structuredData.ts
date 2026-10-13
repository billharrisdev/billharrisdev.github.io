import type { Project } from './projectData';

export const siteUrl = 'https://portfolio.lowkeymg.com/';
export const authorName = 'Bill Harris';
export const authorEmail = 'bill.harris.dev@gmail.com';
export const siteDescription = 'Explore showcase projects and corporate work, including DAW-GNU, Frequency Frontier, Visualizers, and GreatCall.';

const applicationCategories: Record<string, string> = {
  'frequency-frontier': 'GameApplication',
  'daw-gnu': 'MultimediaApplication',
  netmap: 'SecurityApplication',
  visualizers: 'EducationalApplication',
};

export function createStructuredData(projects: Project[]) {
  const personId = `${siteUrl}#author`;
  const websiteId = `${siteUrl}#website`;
  const pageId = `${siteUrl}#portfolio`;
  const listId = `${siteUrl}#projects`;
  const projectId = (project: Project) => `${siteUrl}#project-${project.id}`;
  const orderedProjects = ['Showcase', 'Corporate'].flatMap(category =>
    projects.filter(project => project.category === category));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': personId,
        name: authorName,
        url: siteUrl,
        email: authorEmail,
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: 'billharris.dev',
        url: siteUrl,
        author: { '@id': personId },
        inLanguage: 'en',
      },
      {
        '@type': 'CollectionPage',
        '@id': pageId,
        name: 'Bill Harris — Project Portfolio',
        url: siteUrl,
        description: siteDescription,
        isPartOf: { '@id': websiteId },
        author: { '@id': personId },
        about: { '@id': personId },
        mainEntity: { '@id': listId },
        inLanguage: 'en',
      },
      {
        '@type': 'ItemList',
        '@id': listId,
        name: 'Showcase and corporate projects',
        numberOfItems: orderedProjects.length,
        itemListElement: orderedProjects.map((project, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: { '@id': projectId(project) },
        })),
      },
      ...orderedProjects.map(project => {
        const software = project.category === 'Showcase';
        const browserApp = ['frequency-frontier', 'daw-gnu', 'visualizers'].includes(project.id);
        const images = project.screenshots
          .filter(image => !image.src.startsWith('data:'))
          .map(image => ({
            '@type': 'ImageObject',
            contentUrl: new URL(image.src, siteUrl).href,
            caption: image.caption,
            name: image.alt,
          }));
        return {
          '@type': software ? (browserApp ? 'WebApplication' : 'SoftwareApplication') : 'CreativeWork',
          '@id': projectId(project),
          name: project.name,
          description: project.description,
          url: project.href ?? projectId(project),
          subjectOf: { '@id': pageId },
          ...(software ? { author: { '@id': personId } } : { contributor: { '@id': personId } }),
          ...(software ? {
            applicationCategory: applicationCategories[project.id],
            operatingSystem: ['Windows', 'Linux', 'MacOS', 'ChromeBook'],
          } : {}),
          ...(images.length ? { image: images } : {}),
          ...(software && images.length ? { screenshot: images } : {}),
          ...(software && project.features ? { featureList: project.features } : {}),
          ...(project.status === 'In development' ? { creativeWorkStatus: project.status } : {}),
        };
      }),
    ],
  };
}

// Keep arbitrary project text from terminating the HTML script element.
export function serializeStructuredData(data: ReturnType<typeof createStructuredData>) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
