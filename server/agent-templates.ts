
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'customer_support' | 'research' | 'scheduling' | 'workflow_automation';
  icon: string;
  systemPrompt: string;
  suggestedTools: string[];
  defaultConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  sampleWorkflow?: {
    nodes: any[];
    edges: any[];
  };
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'customer_support',
    name: 'Customer Support Bot',
    description: 'Handles customer inquiries, troubleshooting, and support tickets',
    type: 'customer_support',
    icon: '🎧',
    systemPrompt: `You are a helpful customer support assistant. Your role is to:
- Provide friendly, professional support
- Help troubleshoot common issues
- Escalate complex problems to human agents
- Maintain a positive, solution-focused attitude
- Ask clarifying questions when needed`,
    suggestedTools: ['ticket_creation', 'knowledge_base_search', 'escalation'],
    defaultConfig: {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3,
      maxTokens: 1000
    },
    sampleWorkflow: {
      nodes: [
        { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { name: 'Customer Message' } },
        { id: '2', type: 'ai_process', position: { x: 300, y: 100 }, data: { name: 'Analyze Intent' } },
        { id: '3', type: 'decision', position: { x: 500, y: 100 }, data: { name: 'Can Resolve?' } },
        { id: '4', type: 'action', position: { x: 700, y: 50 }, data: { name: 'Send Solution' } },
        { id: '5', type: 'action', position: { x: 700, y: 150 }, data: { name: 'Escalate to Human' } }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e3-5', source: '3', target: '5' }
      ]
    }
  },
  {
    id: 'research_bot',
    name: 'Research Assistant',
    description: 'Conducts research, summarizes information, and provides insights',
    type: 'research',
    icon: '🔍',
    systemPrompt: `You are a research assistant specialized in gathering and analyzing information. Your responsibilities:
- Conduct thorough research on given topics
- Provide accurate, well-sourced information
- Summarize complex information clearly
- Identify key insights and trends
- Cite sources when possible`,
    suggestedTools: ['web_search', 'document_analysis', 'data_visualization'],
    defaultConfig: {
      model: 'gpt-4',
      temperature: 0.2,
      maxTokens: 2000
    }
  },
  {
    id: 'scheduling_assistant',
    name: 'Scheduling Assistant',
    description: 'Manages calendars, schedules meetings, and handles appointments',
    type: 'scheduling',
    icon: '📅',
    systemPrompt: `You are a scheduling assistant that helps manage calendars and appointments. Your tasks:
- Schedule and reschedule meetings
- Check availability across calendars
- Send meeting reminders
- Handle time zone conversions
- Coordinate with multiple participants`,
    suggestedTools: ['calendar_integration', 'email_notifications', 'timezone_converter'],
    defaultConfig: {
      model: 'gemini-1.5-flash',
      temperature: 0.1,
      maxTokens: 800
    }
  },
  {
    id: 'workflow_automation',
    name: 'Workflow Automation Agent',
    description: 'Automates business processes and integrates with various tools',
    type: 'workflow_automation',
    icon: '⚙️',
    systemPrompt: `You are a workflow automation agent that streamlines business processes. Your capabilities:
- Automate repetitive tasks
- Integrate multiple systems
- Process and route data
- Trigger actions based on conditions
- Monitor and report on workflows`,
    suggestedTools: ['api_calls', 'data_transformation', 'conditional_logic', 'notifications'],
    defaultConfig: {
      model: 'claude-3-haiku-20240307',
      temperature: 0.1,
      maxTokens: 1200
    }
  }
];

export class AgentTemplateService {
  getTemplates(): AgentTemplate[] {
    return AGENT_TEMPLATES;
  }

  getTemplate(id: string): AgentTemplate | undefined {
    return AGENT_TEMPLATES.find(template => template.id === id);
  }

  createAgentFromTemplate(templateId: string, customizations?: Partial<AgentTemplate>) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return {
      ...template,
      ...customizations,
      config: {
        ...template.defaultConfig,
        systemPrompt: template.systemPrompt,
        tools: template.suggestedTools
      }
    };
  }
}

export const agentTemplateService = new AgentTemplateService();
