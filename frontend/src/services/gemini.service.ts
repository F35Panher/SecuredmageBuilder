import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { ContainerConfig } from '../types';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | null = null;
  private isKeyFetched = false;

  constructor() {}

  // Invalidate the current client and key, forcing a re-fetch on next call.
  reset(): void {
    this.ai = null;
    this.apiKey = null;
    this.isKeyFetched = false;
  }

  private async fetchAndSetApiKey(): Promise<boolean> {
    if (this.isKeyFetched) {
      return this.apiKey !== null;
    }

    try {
      this.isKeyFetched = true; // Mark as fetched even if it fails, to prevent re-fetching constantly
      const response = await fetch('/api/gemini-key');

      if (response.ok) {
        const data = await response.json();
        if (data.apiKey) {
          this.apiKey = data.apiKey;
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to fetch API key', e);
    }
    
    this.apiKey = null;
    return false;
  }
  
  private async ensureInitialized(): Promise<boolean> {
    const hasKey = await this.fetchAndSetApiKey();
    if (!hasKey || !this.apiKey) {
      return false;
    }
    // Initialize the AI client only if it hasn't been already
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return true;
  }

  async getSecurityRecommendations(config: ContainerConfig): Promise<string> {
    const isReady = await this.ensureInitialized();
    if (!isReady || !this.ai) {
      return 'API Key not configured. Please set it in the Admin Console.';
    }

    const prompt = `
      Analyze the following container configuration for security vulnerabilities and suggest improvements.
      The configuration is:
      - Base OS: ${config.baseOs}
      - Technology Stacks: ${config.techStack.join(', ') || 'None'}
      - Installed Packages: ${config.packages.join(', ') || 'None'}
      - Exposed Ports: ${config.ports.join(', ') || 'None'}

      Based on this configuration, provide a concise, actionable list of 2-3 security recommendations.
      Focus on high-impact suggestions like removing risky packages, choosing a more minimal base image if applicable,
      or warning about dangerous port exposures. Frame the response as helpful advice. Do not repeat the configuration.
      Format the output as a simple string with bullet points (using '*') for each recommendation.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-pro',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // More specific error for the user
      if (error instanceof Error && error.message.includes('API key not valid')) {
        return 'The provided API Key is not valid. Please check the key in the Admin Console.';
      }
      return 'Could not retrieve AI recommendations at this time. Please check the console for errors.';
    }
  }
}
