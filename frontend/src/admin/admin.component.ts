import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { BaseImage, SecurityRule, SelectableItem, Severity, SecurityLevel, TechStackGroup } from '../types';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  configService = inject(ConfigService);
  
  newSelectableItem = signal<SelectableItem>({ id: '', name: '' });
  newBaseImage = signal<BaseImage>({ id: '', name: '', version: '', source: '', securityLevel: 'Standard' });
  newTechStack = signal({ techId: '', techName: '', version: '' });
  
  newRule = signal<SecurityRule>({
    type: 'package',
    identifier: '',
    severity: 'Medium',
    message: '',
    reason: '',
    deduction: 10,
    techStack: 'all'
  });
  
  openTechGroup = signal<string | null>(null);

  severities: Severity[] = ['Low', 'Medium', 'High', 'Critical'];
  ruleTypes: SecurityRule['type'][] = ['baseOs', 'package', 'port', 'envVar'];
  securityLevels: SecurityLevel[] = ['Minimal', 'Standard', 'Full'];

  adminTechStackGroups = computed((): TechStackGroup[] => {
    const options = this.configService.techStacks();
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

  packagesWithSeverity = computed(() => {
    const packages = this.configService.packages();
    const rules = this.configService.securityRules();
    return packages.map(pkg => {
      const rule = rules.find(r => r.type === 'package' && r.identifier === pkg.id);
      return {
        ...pkg,
        severity: rule?.severity as Severity | undefined
      };
    });
  });

  toggleTechGroup(techId: string): void {
    this.openTechGroup.update(current => (current === techId ? null : techId));
  }

  addBaseImage(): void {
    const image = this.newBaseImage();
    if (image.id && image.name && image.version) {
      this.configService.addBaseImage({ ...image });
      this.newBaseImage.set({ id: '', name: '', version: '', source: '', securityLevel: 'Standard' }); // Reset
    }
  }

  addTechStackVersion(): void {
    const { techId, techName, version } = this.newTechStack();
    if (techId && techName && version) {
        // Simple validation to remove 'v' if user adds it
        const cleanVersion = version.startsWith('v') ? version.substring(1) : version;
        const newItem: SelectableItem = {
            id: `${techId.toLowerCase()}-${cleanVersion}`,
            name: `${techName} (v${cleanVersion})`
        };
        this.configService.addSelectableItem('techStacks', newItem);
        this.newTechStack.set({ techId: '', techName: '', version: '' });
    }
  }

  addItem(list: 'packages'): void {
    const item = this.newSelectableItem();
    if (item.id && item.name) {
      this.configService.addSelectableItem(list, { ...item });
      this.newSelectableItem.set({ id: '', name: '' }); // Reset
    }
  }

  addRule(): void {
    const rule = { ...this.newRule() }; // create a copy
    // basic validation
    if (rule.identifier && rule.message && rule.reason) {
      if (rule.techStack === 'all') {
        delete rule.techStack; // 'all' means it's a global rule (techStack property is undefined)
      }
      this.configService.addSecurityRule(rule);
      // Reset form
      this.newRule.set({
        type: 'package',
        identifier: '',
        severity: 'Medium',
        message: '',
        reason: '',
        deduction: 10,
        techStack: 'all'
      });
    }
  }
}