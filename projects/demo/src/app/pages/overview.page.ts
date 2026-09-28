import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../components/code-block.component';

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [RouterLink, CodeBlockComponent],
  templateUrl: './overview.page.html',
  styleUrl: './docs-page.css',
})
export class OverviewPageComponent {
  readonly install = `npm install ngxsmk-socket-io socket.io-client`;

  readonly bootstrap = `import { bootstrapApplication } from '@angular/platform-browser';
import { provideSocketIo } from 'ngxsmk-socket-io';

bootstrapApplication(AppComponent, {
  providers: [
    provideSocketIo({
      url: 'http://localhost:3000',
      options: { transports: ['websocket'] },
    }),
  ],
});`;
}
