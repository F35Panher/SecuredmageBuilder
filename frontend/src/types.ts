export interface SelectableItem {
  id: string;
  name: string;
}

export type SecurityLevel = 'Minimal' | 'Standard' | 'Full';

export interface BaseImage extends SelectableItem {
  version: string;
  source?: string;
  securityLevel: SecurityLevel;
}

export interface EnvVar {
  key: string;
  value: string;
}

export interface ContainerConfig {
  baseOs: string;
  techStack: string[];
  packages: string[];
  ports: string[];
  envVars: EnvVar[];
  registry: string;
}

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface SecurityRule {
  type: 'package' | 'port' | 'baseOs' | 'envVar';
  // Use string for identifier for easier form handling. Regex will be stored as a string like "/.../i"
  identifier: string; 
  severity: Severity;
  message: string;
  reason: string;
  deduction: number;
  techStack?: string;
}

export interface AuditResult {
  severity: Severity;
  message: string;
  reason: string;
}

// New interfaces for grouped tech stacks
export interface TechStackVersion {
  id: string;
  version: string;
}

export interface TechStackGroup {
  techId: string;
  name: string;
  versions: TechStackVersion[];
}