import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../services/config.service';
import { BaseImage, SecurityRule, SelectableItem, Severity } from '../types';

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
  newBaseImage = signal<BaseImage>({ id: '', name: '', version: '', source: '' });
  
  newRule = signal<SecurityRule>({
    type: 'package',
    identifier: '',
    severity: 'Medium',
    message: '',
    reason: '',
    deduction: 10,
    techStack: 'all'
  });
  
  severities: SecurityRule['severity'][] = ['Low', 'Medium', 'High', 'Critical'];
  ruleTypes: SecurityRule['type'][] = ['baseOs', 'package', 'port', 'envVar'];

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

  addBaseImage(): void {
    const image = this.newBaseImage();
    if (image.id && image.name && image.version) {
      this.configService.addBaseImage({ ...image });
      this.newBaseImage.set({ id: '', name: '', version: '', source: '' }); // Reset
    }
  }

  addItem(list: 'techStacks' | 'packages'): void {
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
