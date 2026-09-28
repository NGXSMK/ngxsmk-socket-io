import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { DocSeoService } from './seo/doc-seo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <router-outlet />
  `,
  styles: [
    `
      .skip-link {
        position: absolute;
        left: -9999px;
        top: 0;
        z-index: 1000;
        padding: 0.65rem 1rem;
        background: #07121f;
        color: #d7f4f4;
        text-decoration: none;
        border-radius: 0 0 8px 0;
      }

      .skip-link:focus {
        left: 0;
      }
    `,
  ],
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly seo = inject(DocSeoService);

  constructor() {
    this.seo.applyDefaults();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.seo.applyForUrl(event.urlAfterRedirects);
      });
  }
}
