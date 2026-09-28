import { Routes } from '@angular/router';
import { DOC_SEO_PAGES } from './seo/doc-seo';

const [overviewSeo, guideSeo, playgroundSeo, apiSeo] = DOC_SEO_PAGES;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/docs-shell.component').then((m) => m.DocsShellComponent),
    children: [
      {
        path: '',
        title: overviewSeo.title,
        loadComponent: () => import('./pages/overview.page').then((m) => m.OverviewPageComponent),
      },
      {
        path: 'guide',
        title: guideSeo.title,
        loadComponent: () => import('./pages/guide.page').then((m) => m.GuidePageComponent),
      },
      {
        path: 'playground',
        title: playgroundSeo.title,
        loadComponent: () =>
          import('./pages/playground.page').then((m) => m.PlaygroundPageComponent),
      },
      {
        path: 'api',
        title: apiSeo.title,
        loadComponent: () => import('./pages/api.page').then((m) => m.ApiPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
