
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: string[];
  version: string;
  successRate?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export class PromptLibrary {
  private templates: Map<string, PromptTemplate[]> = new Map();
  private categories = [
    'customer-support',
    'content-generation',
    'data-analysis',
    'research',
    'scheduling',
    'workflow-automation',
    'classification',
    'summarization'
  ];

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: PromptTemplate[] = [
      {
        id: 'customer-support-greeting',
        name: 'Customer Support Greeting',
        description: 'Professional greeting for customer support interactions',
        category: 'customer-support',
        template: 'Hello {{customer_name}}! Thank you for contacting {{company_name}}. I\'m here to help you with {{issue_type}}. How can I assist you today?',
        variables: ['customer_name', 'company_name', 'issue_type'],
        version: '1.0.0',
        successRate: 0.95,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'content-blog-outline',
        name: 'Blog Post Outline Generator',
        description: 'Generate structured blog post outlines',
        category: 'content-generation',
        template: 'Create a detailed blog post outline for the topic "{{topic}}" targeting {{audience}}. Include:\n1. Compelling headline\n2. Introduction hook\n3. 5-7 main sections with subpoints\n4. Conclusion with call-to-action\n5. SEO keywords: {{keywords}}',
        variables: ['topic', 'audience', 'keywords'],
        version: '1.0.0',
        successRate: 0.88,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'data-analysis-summary',
        name: 'Data Analysis Summary',
        description: 'Analyze and summarize data patterns',
        category: 'data-analysis',
        template: 'Analyze the following dataset and provide insights:\n\nData: {{data}}\n\nPlease provide:\n1. Key patterns and trends\n2. Statistical summary\n3. Anomalies or outliers\n4. Business recommendations\n5. Visual representation suggestions',
        variables: ['data'],
        version: '1.0.0',
        successRate: 0.82,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'research-competitor-analysis',
        name: 'Competitor Analysis Research',
        description: 'Research and analyze competitors',
        category: 'research',
        template: 'Research and analyze {{company_name}}\'s competitors in the {{industry}} space. Focus on:\n\n1. Top 5 direct competitors\n2. Their key products/services\n3. Pricing strategies\n4. Market positioning\n5. Strengths and weaknesses\n6. Market opportunities for {{company_name}}',
        variables: ['company_name', 'industry'],
        version: '1.0.0',
        successRate: 0.90,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'text-classifier',
        name: 'Text Classification',
        description: 'Classify text into predefined categories',
        category: 'classification',
        template: 'Classify the following text into one of these categories: {{categories}}\n\nText: "{{text}}"\n\nProvide:\n1. Primary category\n2. Confidence score (0-1)\n3. Reasoning\n4. Alternative categories if applicable',
        variables: ['categories', 'text'],
        version: '1.0.0',
        successRate: 0.87,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'document-summarizer',
        name: 'Document Summarizer',
        description: 'Create concise summaries of long documents',
        category: 'summarization',
        template: 'Summarize the following document in {{length}} words or less:\n\n{{document}}\n\nInclude:\n1. Main points\n2. Key findings\n3. Action items (if any)\n4. Important dates or numbers',
        variables: ['document', 'length'],
        version: '1.0.0',
        successRate: 0.91,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Group templates by category
    defaultTemplates.forEach(template => {
      if (!this.templates.has(template.category)) {
        this.templates.set(template.category, []);
      }
      this.templates.get(template.category)!.push(template);
    });
  }

  getTemplatesByCategory(category: string): PromptTemplate[] {
    return this.templates.get(category) || [];
  }

  getAllTemplates(): PromptTemplate[] {
    const allTemplates: PromptTemplate[] = [];
    this.templates.forEach(categoryTemplates => {
      allTemplates.push(...categoryTemplates);
    });
    return allTemplates;
  }

  getTemplate(id: string): PromptTemplate | null {
    for (const categoryTemplates of this.templates.values()) {
      const template = categoryTemplates.find(t => t.id === id);
      if (template) return template;
    }
    return null;
  }

  addTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): PromptTemplate {
    const newTemplate: PromptTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.templates.has(template.category)) {
      this.templates.set(template.category, []);
    }
    this.templates.get(template.category)!.push(newTemplate);
    
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<PromptTemplate>): PromptTemplate | null {
    for (const categoryTemplates of this.templates.values()) {
      const templateIndex = categoryTemplates.findIndex(t => t.id === id);
      if (templateIndex !== -1) {
        categoryTemplates[templateIndex] = {
          ...categoryTemplates[templateIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return categoryTemplates[templateIndex];
      }
    }
    return null;
  }

  renderTemplate(templateId: string, variables: Record<string, string>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let rendered = template.template;
    template.variables.forEach(variable => {
      const value = variables[variable] || `{{${variable}}}`;
      rendered = rendered.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    });

    return rendered;
  }

  updateSuccessRate(templateId: string, success: boolean) {
    const template = this.getTemplate(templateId);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
      const currentRate = template.successRate || 0;
      const currentCount = template.usageCount;
      
      // Calculate new success rate using weighted average
      template.successRate = ((currentRate * (currentCount - 1)) + (success ? 1 : 0)) / currentCount;
      template.updatedAt = new Date().toISOString();
    }
  }

  getTopPerformingTemplates(limit: number = 10): PromptTemplate[] {
    return this.getAllTemplates()
      .filter(t => (t.usageCount || 0) > 5) // Only templates with sufficient usage
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
      .slice(0, limit);
  }

  getCategories(): string[] {
    return this.categories;
  }

  searchTemplates(query: string): PromptTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTemplates().filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.category.toLowerCase().includes(lowercaseQuery)
    );
  }
}

export const promptLibrary = new PromptLibrary();
