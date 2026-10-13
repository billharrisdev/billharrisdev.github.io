import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

async function loadTypeScript(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { createProjects } = await loadTypeScript('../src/lib/projectData.ts');
const { createStructuredData, serializeStructuredData, siteUrl } = await loadTypeScript('../src/lib/structuredData.ts');
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];

test('built HTML contains one JSON-LD graph and the canonical URL without JavaScript', () => {
  assert.equal(scripts.length, 1);
  assert.ok(html.includes(`rel="canonical" href="${siteUrl}"`));
  const data = JSON.parse(scripts[0][1]);
  assert.equal(data['@context'], 'https://schema.org');
  const ids = data['@graph'].map(entity => entity['@id']);
  assert.equal(new Set(ids).size, ids.length);
  function checkReferences(value) {
    if (!value || typeof value !== 'object') return;
    if (value['@id']) assert.ok(ids.includes(value['@id']), `Unresolved reference: ${value['@id']}`);
    Object.values(value).forEach(checkReferences);
  }
  checkReferences(data);
});

test('author identity and project credits match the shared project data', () => {
  const graph = JSON.parse(scripts[0][1])['@graph'];
  const author = graph.find(entity => entity['@type'] === 'Person');
  assert.equal(author.name, 'Bill Harris');
  assert.equal(author.email, 'bill.harris.dev@gmail.com');
  assert.equal(author.url, siteUrl);
  assert.deepEqual(author.sameAs, [
    'https://github.com/billharrisdev',
    'http://www.linkedin.com/in/bill-harris-dev',
    'https://www.youtube.com/@BillHarrisDev',
  ]);
  const projects = createProjects({});
  const list = graph.find(entity => entity['@type'] === 'ItemList');
  assert.equal(list.numberOfItems, projects.length);
  assert.deepEqual(list.itemListElement.map(item => item.position), projects.map((_, index) => index + 1));
  projects.forEach((project, index) => {
    const id = `${siteUrl}#project-${project.id}`;
    const entity = graph.find(entity => entity['@id'] === id);
    assert.equal(entity.name, project.name);
    assert.equal(entity.description, project.description);
    assert.equal(list.itemListElement[index].item['@id'], id);
    if (project.category === 'Showcase') {
      assert.equal(entity.author['@id'], author['@id']);
      assert.equal(entity.contributor, undefined);
    } else {
      assert.equal(entity.contributor['@id'], author['@id']);
      assert.equal(entity.author, undefined);
    }
    assert.equal(entity.aggregateRating, undefined);
    assert.equal(entity.datePublished, undefined);
  });
});

test('all four software applications have categories and supported operating systems', () => {
  const graph = JSON.parse(scripts[0][1])['@graph'];
  const categories = {
    'frequency-frontier': 'GameApplication',
    'daw-gnu': 'MultimediaApplication',
    netmap: 'SecurityApplication',
    visualizers: 'EducationalApplication',
  };
  const applications = graph.filter(entity => ['SoftwareApplication', 'WebApplication'].includes(entity['@type']));
  assert.equal(applications.length, 4);
  for (const [id, category] of Object.entries(categories)) {
    const application = applications.find(entity => entity['@id'] === `${siteUrl}#project-${id}`);
    assert.ok(application, `Missing application: ${id}`);
    assert.equal(application.applicationCategory, category);
    assert.deepEqual(application.operatingSystem, ['Windows', 'Linux', 'MacOS', 'ChromeBook']);
  }
  for (const entity of graph.filter(entity => !applications.includes(entity))) {
    assert.equal(entity.applicationCategory, undefined);
    assert.equal(entity.operatingSystem, undefined);
  }
});

test('structured screenshot URLs point to actual emitted assets', () => {
  const graph = JSON.parse(scripts[0][1])['@graph'];
  const images = graph.flatMap(entity => entity.image ?? []);
  assert.ok(images.length > 0);
  for (const image of images) {
    const url = new URL(image.contentUrl);
    assert.equal(url.origin, new URL(siteUrl).origin);
    assert.ok(url.pathname.startsWith('/assets/'));
    assert.ok(existsSync(new URL(`../dist${url.pathname}`, import.meta.url)));
  }
});

test('serialization safely escapes script-closing text while preserving JSON', () => {
  const projects = createProjects({});
  projects[0].description = '</script><script>alert("test")</script>';
  const serialized = serializeStructuredData(createStructuredData(projects));
  assert.ok(!serialized.includes('<'));
  const project = JSON.parse(serialized)['@graph'].find(entity => entity.name === projects[0].name);
  assert.equal(project.description, projects[0].description);
});
