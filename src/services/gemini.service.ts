import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { ContainerConfig } from '../types';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is injected via environment variables.
    // Do not expose it in the frontend code.
    if (!process.env.API_KEY) {
      throw new Error('API_KEY environment variable not set');
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async getSecurityRecommendations(config: ContainerConfig): Promise<string> {
    const model = 'gemini-2.5-flash';

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
        model,
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return 'Could not retrieve AI recommendations at this time. Please check the configuration or try again later.';
    }
  }
}
