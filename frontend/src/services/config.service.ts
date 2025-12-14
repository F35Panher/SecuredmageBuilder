import { Injectable, signal } from '@angular/core';
import { BaseImage, SelectableItem, SecurityRule } from '../types';
import * as yaml from 'js-yaml';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  // --- Signals ---
  baseOs = signal<BaseImage[]>([]);
  techStacks = signal<SelectableItem[]>([]);
  packages = signal<SelectableItem[]>([]);
  securityRules = signal<SecurityRule[]>([]);

  constructor() {
    this.loadInitialConfig();
  }

  private async loadInitialConfig(): Promise<void> {
    try {
      const response = await fetch('config.yaml');
      if (!response.ok) {
        throw new Error(`Failed to fetch config.yaml: ${response.statusText}`);
      }
      const yamlText = await response.text();
      const defaults = yaml.load(yamlText) as {
        baseOs: BaseImage[],
        techStacks: SelectableItem[],
        packages: SelectableItem[],
        securityRules: SecurityRule[]
      };

      this.baseOs.set(this._getFromLocalStorage('config_baseOs', defaults.baseOs || []));
      this.techStacks.set(this._getFromLocalStorage('config_techStacks', defaults.techStacks || []));
      this.packages.set(this._getFromLocalStorage('config_packages', defaults.packages || []));
      this.securityRules.set(this._getFromLocalStorage('config_securityRules', defaults.securityRules || []));
      
    } catch (error) {
      console.error("Fatal: Could not load default configuration from config.yaml. Falling back to local storage or empty.", error);
      this.baseOs.set(this._getFromLocalStorage('config_baseOs', []));
      this.techStacks.set(this._getFromLocalStorage('config_techStacks', []));
      this.packages.set(this._getFromLocalStorage('config_packages', []));
      this.securityRules.set(this._getFromLocalStorage('config_securityRules', []));
    }
  }

  private _getFromLocalStorage<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading from localStorage for key "${key}"`, e);
      return defaultValue;
    }
  }

  private _saveToLocalStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving to localStorage for key "${key}"`, e);
    }
  }

  // --- Update Methods with Persistence ---

  addBaseImage(image: BaseImage): void {
    this.baseOs.update(images => {
      const updated = [...images, image];
      this._saveToLocalStorage('config_baseOs', updated);
      return updated;
    });
  }

  removeBaseImage(id: string): void {
    this.baseOs.update(images => {
      const updated = images.filter(image => image.id !== id);
      this._saveToLocalStorage('config_baseOs', updated);
      return updated;
    });
  }

  addSelectableItem(list: 'techStacks' | 'packages', item: SelectableItem): void {
    this[list].update(items => {
      const updated = [...items, item];
      this._saveToLocalStorage(`config_${list}`, updated);
      return updated;
    });
  }
  
  removeSelectableItem(list: 'techStacks' | 'packages', id: string): void {
    this[list].update(items => {
      const updated = items.filter(item => item.id !== id);
      this._saveToLocalStorage(`config_${list}`, updated);
      return updated;
    });
  }

  addSecurityRule(rule: SecurityRule): void {
    this.securityRules.update(rules => {
      const updated = [...rules, rule];
      this._saveToLocalStorage('config_securityRules', updated);
      return updated;
    });
  }

  removeSecurityRule(index: number): void {
    this.securityRules.update(rules => {
      const updated = rules.filter((_, i) => i !== index);
      this._saveToLocalStorage('config_securityRules', updated);
      return updated;
    });
  }
}
