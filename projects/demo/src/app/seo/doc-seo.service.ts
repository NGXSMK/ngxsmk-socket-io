import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { DOC_SEO_PAGES, docSeoForUrl, type DocSeoPage } from './doc-seo';

@Injectable({ providedIn: 'root' })
export class DocSeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** Apply SEO tags for the current router URL (path only). */
  applyForUrl(url: string): void {
    this.apply(docSeoForUrl(url));
  }

  /** Seed defaults used by the shell index.html / first paint. */
  applyDefaults(): void {
    this.apply(DOC_SEO_PAGES[0]);
  }

  apply(page: DocSeoPage): void {
    const canonical = this.canonicalUrl(page.path);
    const image = `${environment.siteUrl}/og.svg`;

    this.title.setTitle(page.title);

    this.upsertName('description', page.description);
    this.upsertName('keywords', page.keywords);
    this.upsertName('author', 'Sachin · SMK WEB Projects');
    this.upsertName('robots', 'index, follow, max-image-preview:large');
    this.upsertName('theme-color', '#0b1c24');

    this.upsertProperty('og:type', 'website');
    this.upsertProperty('og:site_name', environment.siteName);
    this.upsertProperty('og:title', page.title);
    this.upsertProperty('og:description', page.description);
    this.upsertProperty('og:url', canonical);
    this.upsertProperty('og:image', image);
    this.upsertProperty('og:locale', 'en_US');

    this.upsertName('twitter:card', 'summary_large_image');
    this.upsertName('twitter:title', page.title);
    this.upsertName('twitter:description', page.description);
    this.upsertName('twitter:image', image);

    this.setCanonical(canonical);
    this.setJsonLd(page, canonical);
  }

  private canonicalUrl(path: string): string {
    const base = environment.siteUrl.replace(/\/$/, '');
    return path ? `${base}/${path}` : `${base}/`;
  }

  private upsertName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private upsertProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setCanonical(href: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private setJsonLd(page: DocSeoPage, canonical: string): void {
    const payload = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${environment.siteUrl}/#website`,
          url: `${environment.siteUrl}/`,
          name: environment.siteName,
          description:
            'Documentation and playground for ngxsmk-socket-io, a modern Angular Socket.IO library.',
          publisher: {
            '@type': 'Organization',
            name: 'SMK WEB Projects',
            url: 'https://github.com/SMK-WEB-Projects',
          },
        },
        {
          '@type': 'WebPage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          name: page.title,
          description: page.description,
          isPartOf: { '@id': `${environment.siteUrl}/#website` },
          inLanguage: 'en',
        },
        {
          '@type': 'SoftwareSourceCode',
          name: 'ngxsmk-socket-io',
          description:
            'Angular library for Socket.IO with provideSocketIo, typed events, Signals, RxJS, and SSR-safe defaults.',
          codeRepository: 'https://github.com/SMK-WEB-Projects/ngxsmk-socket-io',
          programmingLanguage: ['TypeScript', 'Angular'],
          runtimePlatform: 'Angular',
          license: 'https://opensource.org/licenses/MIT',
          url: 'https://www.npmjs.com/package/ngxsmk-socket-io',
        },
      ],
    };

    let script = this.document.getElementById('doc-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = 'doc-jsonld';
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(payload);
  }
}
