import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContainerConfig, Severity } from './types';
import { ConfigService } from './services/config.service';
import { SecurityAuditService } from './services/security-audit.service';
import { CodeGeneratorService } from './services/code-generator.service';
import { GeminiService } from './services/gemini.service';
import { AdminComponent } from './admin/admin.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [AdminComponent, CommonModule],
})
export class AppComponent {
  private readonly configService = inject(ConfigService);
  private readonly auditService = inject(SecurityAuditService);
  private readonly codeGenerator = inject(CodeGeneratorService);
  private readonly geminiService = inject(GeminiService);

  // App state
  activeTab = signal<'audit' | 'dockerfile' | 'cicd'>('audit');
  viewMode = signal<'builder' | 'admin'>('builder');

  // AI suggestion state
  aiSuggestion = signal<string>('');
  isGeneratingSuggestion = signal<boolean>(false);
  
  // Available options from config service
  baseOsOptions = this.configService.baseOs;
  techStackOptions = this.configService.techStacks;
  packageOptions = this.configService.packages;

  // User's current container configuration
  config = signal<ContainerConfig>({
    baseOs: 'wolfi',
    techStack: ['nodejs'],
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


  // --- Methods to update configuration ---

  setBaseOs(osId: string): void {
    this.config.update(c => ({ ...c, baseOs: osId }));
  }

  toggleTechStack(itemId: string): void {
    this.config.update(c => {
      const currentItems = c.techStack;
      const newItems = currentItems.includes(itemId)
        ? currentItems.filter(id => id !== itemId)
        : [...currentItems, itemId];
      return { ...c, techStack: newItems };
    });
  }
  
  addPackage(pkgId: string): void {
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

  async generateAiSuggestion(): Promise<void> {
    this.isGeneratingSuggestion.set(true);
    this.aiSuggestion.set('');
    try {
      const suggestion = await this.geminiService.getSecurityRecommendations(this.config());
      this.aiSuggestion.set(suggestion);
    } catch (error) {
      this.aiSuggestion.set('Failed to generate suggestions.');
    } finally {
      this.isGeneratingSuggestion.set(false);
    }
  }
}
