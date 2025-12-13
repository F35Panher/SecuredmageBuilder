import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GeminiService } from './services/gemini.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly geminiService = inject(GeminiService);

  prompt = signal<string>('A photorealistic image of an astronaut riding a horse on Mars, cinematic lighting.');
  generatedImage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  onPromptInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.prompt.set(target.value);
  }

  async generateImage(): Promise<void> {
    if (!this.prompt().trim() || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.generatedImage.set(null);

    try {
      const imageDataUrl = await this.geminiService.generateImage(this.prompt());
      this.generatedImage.set(imageDataUrl);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error.set(`Failed to generate image. ${errorMessage}`);
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }
}
