import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-docs-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './docs-shell.component.html',
  styleUrl: './docs-shell.component.css',
})
export class DocsShellComponent {
  readonly production = environment.production;
  readonly links = [
    { path: '/', label: 'Overview', exact: true },
    { path: '/guide', label: 'Guide', exact: false },
    { path: '/playground', label: 'Playground', exact: false },
    { path: '/api', label: 'Advanced', exact: false },
  ];
}
