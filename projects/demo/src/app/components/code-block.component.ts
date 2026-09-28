import { Component, input } from '@angular/core';

@Component({
  selector: 'app-code-block',
  standalone: true,
  template: `
    <figure class="code">
      @if (title()) {
        <figcaption>{{ title() }}</figcaption>
      }
      <pre><code>{{ code() }}</code></pre>
    </figure>
  `,
  styles: [
    `
      .code {
        margin: 0;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: #07121f;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      figcaption {
        padding: 0.7rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        color: #8eb4c4;
        font-family: var(--font-mono);
        font-size: 0.78rem;
      }

      pre {
        margin: 0;
        padding: 1rem 1.1rem 1.15rem;
        overflow: auto;
        color: #d7f4f4;
        font-size: 0.84rem;
        line-height: 1.55;
      }
    `,
  ],
})
export class CodeBlockComponent {
  readonly title = input('');
  readonly code = input.required<string>();
}
