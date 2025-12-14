import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DockerStep {
  command: string;
  args: string;
  raw: string;
}

interface DockerStage {
  name: string;
  baseImage: string;
  steps: DockerStep[];
}

@Component({
  selector: 'app-docker-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docker-visualizer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockerVisualizerComponent {
  dockerfileContent = input.required<string>();

  parsedDockerfile = computed<DockerStage[]>(() => {
    const content = this.dockerfileContent();
    const lines = content.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
    const stages: DockerStage[] = [];
    let currentStage: DockerStage | null = null;

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const command = parts[0].toUpperCase();

      if (command === 'FROM') {
        if (currentStage) {
          stages.push(currentStage);
        }
        const asIndex = parts.map(p => p.toUpperCase()).indexOf('AS');
        const baseImage = parts[1];
        const stageName = asIndex > -1 ? parts[asIndex + 1] : `Stage ${stages.length}`;
        currentStage = {
          name: stageName,
          baseImage: baseImage,
          steps: [],
        };
      } else if (currentStage) {
        currentStage.steps.push({
          command: command,
          args: parts.slice(1).join(' '),
          raw: line.trim(),
        });
      }
    }
    if (currentStage) {
      stages.push(currentStage);
    }
    return stages;
  });
}
