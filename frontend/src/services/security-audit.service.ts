import { Injectable, inject } from '@angular/core';
import { ContainerConfig, AuditResult, SecurityRule } from '../types';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class SecurityAuditService {
  private readonly configService = inject(ConfigService);
  
  runAudit(config: ContainerConfig): { score: number; results: AuditResult[] } {
    const baseImages = this.configService.baseOs();
    const selectedBaseImage = baseImages.find(os => os.id === config.baseOs);

    // Define base scores for each security level
    const BASE_SCORES = {
      'Minimal': 100,
      'Standard': 90,
      'Full': 75
    };
    
    // Initialize score based on the selected base image's security level
    let score = selectedBaseImage ? BASE_SCORES[selectedBaseImage.securityLevel] : 90; // Default to standard if not found

    const results: AuditResult[] = [];
    const rules = this.configService.securityRules(); // Get current rules from the signal

    const addFinding = (rule: SecurityRule) => {
      score -= rule.deduction;
      results.push({
        severity: rule.severity,
        message: rule.message,
        reason: rule.reason,
      });
    };

    // Filter rules to only include global rules or those relevant to the selected tech stack
    const relevantRules = rules.filter(rule => 
      !rule.techStack || config.techStack.includes(rule.techStack)
    );

    // Check Base OS
    const baseOsRule = relevantRules.find(r => r.type === 'baseOs' && r.identifier === config.baseOs);
    if (baseOsRule) {
      addFinding(baseOsRule);
    }

    // Check Packages
    config.packages.forEach(pkg => {
      const pkgRule = relevantRules.find(r => r.type === 'package' && r.identifier === pkg);
      if (pkgRule) {
        addFinding(pkgRule);
      }
    });

    // Check Ports
    config.ports.forEach(port => {
      const portRule = relevantRules.find(r => r.type === 'port' && r.identifier === port);
      if (portRule) {
        addFinding(portRule);
      }
    });
    
    // Check Environment Variables
    config.envVars.forEach(env => {
       const envVarRule = relevantRules.find(r => {
        if (r.type === 'envVar' && typeof r.identifier === 'string' && r.identifier.startsWith('/')) {
            // It's a regex string
            try {
                const regex = new RegExp(r.identifier.slice(1, -1), 'i');
                return regex.test(env.key);
            } catch (e) {
                console.error("Invalid regex in security rule", r.identifier);
                return false;
            }
        }
        return false;
      });
      if (envVarRule) {
         addFinding(envVarRule);
      }
    });

    return {
      score: Math.max(0, score),
      results: results.sort((a, b) => {
        const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
    };
  }
}