import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContainerConfig, Severity, TechStackGroup, TechStackVersion } from './types';
import { ConfigService } from './services/config.service';
import { SecurityAuditService } from './services/security-audit.service';
import { CodeGeneratorService } from './services/code-generator.service';
import { AdminComponent } from './admin/admin.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DockerVisualizerComponent } from './visualizer/docker-visualizer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [AdminComponent, CommonModule, DockerVisualizerComponent, FormsModule],
})
export class AppComponent {
  public version = 'v0.0.09';
  private readonly configService = inject(ConfigService);
  private readonly auditService = inject(SecurityAuditService);
  private readonly codeGenerator = inject(CodeGeneratorService);

    // App state

    activeTab = signal<'audit' | 'dockerfile' | 'cicd' | 'visualizer'>('audit');

    viewMode = signal<'builder' | 'admin'>('builder');

    uiMode = signal<'classic' | 'modern'>('classic');

  

    // Available options from config service
  baseOsOptions = this.configService.baseOs;
  techStackOptions = this.configService.techStacks;
  packageOptions = this.configService.packages;

  // User's current container configuration
  config = signal<ContainerConfig>({
    baseOs: 'wolfi',
    techStack: ['nodejs-20'],
    packages: ['git'],
    ports: ['8080'],
    envVars: [{ key: 'NODE_ENV', value: 'production' }],
    registry: 'ghcr.io',
  });

  // Derived state for UI and logic
  auditReport = computed(() => this.auditService.runAudit(this.config()));
  dockerfileContent = computed(() => this.codeGenerator.generateDockerfile(this.config()));
  ciCdContent = computed(() => this.codeGenerator.generateCiCd(this.config()));

  packagesWithSeverity = computed(() => {
    const rules = this.configService.securityRules();
    return this.packageOptions().map(pkg => {
      const rule = rules.find(r => r.type === 'package' && r.identifier === pkg.id);
      return { ...pkg, severity: rule?.severity as Severity | undefined };
    });
  });

  availablePackages = computed(() => 
    this.packagesWithSeverity().filter(p => !this.config().packages.includes(p.id))
  );
  
  selectedPackages = computed(() => 
    this.packagesWithSeverity().filter(p => this.config().packages.includes(p.id))
  );

  techStackGroups = computed((): TechStackGroup[] => {
    const options = this.techStackOptions();
    const groups: { [key: string]: TechStackGroup } = {};

    options.forEach(option => {
        const match = option.name.match(/(.+) \(v(.+)\)/);
        if (match) {
            const [, techName, version] = match;
            const techId = option.id.split('-')[0];
            if (!groups[techId]) {
                groups[techId] = { techId: techId, name: techName, versions: [] };
            }
            groups[techId].versions.push({ id: option.id, version });
        }
    });
    return Object.values(groups);
  });


  selectedTechStack = computed(() => {
    const selected: { [key: string]: string } = {};
    this.config().techStack.forEach(id => {
      const techId = id.split('-')[0];
      selected[techId] = id;
    });
    return selected;
  });

  // --- Methods to update configuration ---

  setBaseOs(osId: string): void {
    this.config.update(c => ({ ...c, baseOs: osId }));
  }

  isTechStackSelected(techId: string): boolean {
    return this.config().techStack.some(id => id.startsWith(techId));
  }

  toggleTechStackGroup(techId: string, versions: TechStackVersion[]): void {
    this.config.update(c => {
      const isSelected = c.techStack.some(id => id.startsWith(techId));
      let newTechStack = c.techStack.filter(id => !id.startsWith(techId));
  
      if (!isSelected && versions.length > 0) {
        newTechStack.push(versions[0].id);
      }
      
      return { ...c, techStack: newTechStack };
    });
  }
  
  setTechStackVersion(newVersionId: string): void {
    const techId = newVersionId.split('-')[0];
    this.config.update(c => {
      const otherTechs = c.techStack.filter(id => !id.startsWith(techId));
      return { ...c, techStack: [...otherTechs, newVersionId] };
    });
  }
  
  addPackage(pkgId: string): void {
    if (!pkgId || this.config().packages.includes(pkgId)) return;
    this.config.update(c => ({...c, packages: [...c.packages, pkgId]}));
  }

  removePackage(pkgId: string): void {
    this.config.update(c => ({...c, packages: c.packages.filter(id => id !== pkgId)}));
  }

  updatePort(index: number, value: string): void {
    this.config.update(c => {
      const newPorts = [...c.ports];
      newPorts[index] = value;
      return { ...c, ports: newPorts };
    });
  }

  addPort(): void {
    this.config.update(c => ({ ...c, ports: [...c.ports, ''] }));
  }

  removePort(index: number): void {
    this.config.update(c => ({ ...c, ports: c.ports.filter((_, i) => i !== index) }));
  }

  updateEnvVar(index: number, part: 'key' | 'value', value: string): void {
    this.config.update(c => {
      const newEnvVars = c.envVars.map((v, i) => i === index ? { ...v, [part]: value } : v);
      return { ...c, envVars: newEnvVars };
    });
  }

  addEnvVar(): void {
    this.config.update(c => ({ ...c, envVars: [...c.envVars, { key: '', value: '' }] }));
  }

  removeEnvVar(index: number): void {
    this.config.update(c => ({ ...c, envVars: c.envVars.filter((_, i) => i !== index) }));
  }
  
  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      // Maybe show a toast notification here in a real app
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }
  
  downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }


}
