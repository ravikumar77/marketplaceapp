import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Bot, Play, Pause, Archive, Settings, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorkflowBuilder from '@/components/workflow-builder';

interface Agent {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: string;
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    tools: string[];
  };
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  systemPrompt: string;
  suggestedTools: string[];
  defaultConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [newAgentSystemPrompt, setNewAgentSystemPrompt] = useState('');
  const [agentTemplates, setAgentTemplates] = useState<AgentTemplate[]>([]);

  useEffect(() => {
    fetchAgents();
    fetchAgentTemplates();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents?userId=demo-user');
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentTemplates = async () => {
    try {
      const response = await fetch('/api/agent-templates');
      const data = await response.json();
      if (data.success) {
        setAgentTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching agent templates:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer_support': return '🎧';
      case 'research': return '🔍';
      case 'scheduling': return '📅';
      case 'workflow_automation': return '⚙️';
      default: return '🤖';
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgentName || !selectedTemplate) return;

    const newAgent: Agent = {
      id: `agent_${Date.now()}`, // Simplified ID generation
      name: newAgentName,
      description: newAgentDescription || selectedTemplate.description,
      type: selectedTemplate.type,
      status: 'draft',
      createdAt: new Date().toISOString(),
      config: {
        model: selectedTemplate.defaultConfig.model,
        temperature: selectedTemplate.defaultConfig.temperature,
        maxTokens: selectedTemplate.defaultConfig.maxTokens,
        systemPrompt: newAgentSystemPrompt || selectedTemplate.systemPrompt,
        tools: selectedTemplate.suggestedTools,
      },
    };

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      const data = await response.json();
      if (data.success) {
        setAgents([...agents, newAgent]);
        setIsModalOpen(false);
        setSelectedTemplate(null);
        setNewAgentName('');
        setNewAgentDescription('');
        setNewAgentSystemPrompt('');
      } else {
        console.error('Error creating agent:', data.error);
        // Handle error display to user
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      // Handle error display to user
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = agentTemplates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    if (template) {
      setNewAgentName(template.name);
      setNewAgentDescription(template.description);
      setNewAgentSystemPrompt(template.systemPrompt);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Bot className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading agents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600 mt-2">Manage your intelligent AI agents and workflows</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label htmlFor="template">Choose a Template</Label>
                <Select onValueChange={handleTemplateSelect} value={selectedTemplate?.id || ''}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an agent template" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center">
                          <span className="mr-2">{template.icon}</span>
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input id="agent-name" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="agent-description">Description</Label>
                <Textarea id="agent-description" value={newAgentDescription} onChange={(e) => setNewAgentDescription(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="agent-system-prompt">System Prompt</Label>
                <Textarea id="agent-system-prompt" value={newAgentSystemPrompt} onChange={(e) => setNewAgentSystemPrompt(e.target.value)} />
              </div>
              {selectedTemplate && (
                <>
                  <div className="col-span-1">
                    <Label htmlFor="agent-model">Model</Label>
                    <Input id="agent-model" value={selectedTemplate.defaultConfig.model} readOnly />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="agent-temperature">Temperature</Label>
                    <Input id="agent-temperature" type="number" value={selectedTemplate.defaultConfig.temperature} readOnly />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="agent-max-tokens">Max Tokens</Label>
                    <Input id="agent-max-tokens" type="number" value={selectedTemplate.defaultConfig.maxTokens} readOnly />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="agent-tools">Tools</Label>
                    <Input id="agent-tools" value={selectedTemplate.suggestedTools.join(', ')} readOnly />
                  </div>
                </>
              )}
              {/* Placeholder for Workflow Builder integration */}
              <div className="col-span-2">
                <h3 className="text-lg font-semibold mb-2">Workflow Configuration</h3>
                <p className="text-sm text-gray-500 mb-4">Configure your agent's workflow below.</p>
                {selectedTemplate && (
                  <WorkflowBuilder
                    initialPrompt={selectedTemplate.systemPrompt}
                    initialTools={selectedTemplate.suggestedTools}
                    onSave={(workflowConfig) => {
                      // Logic to save workflow config, e.g., update newAgentSystemPrompt and potentially other fields
                      console.log("Workflow saved:", workflowConfig);
                    }}
                  />
                )}
              </div>
            </div>
            <DialogHeader className="flex justify-end p-0">
              <Button onClick={handleCreateAgent} disabled={!newAgentName || !selectedTemplate}>
                Create Agent
              </Button>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Bot className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
            <p className="text-gray-600 mb-6">Create your first AI agent to get started</p>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsModalOpen(true)}>Create Your First Agent</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Create New Agent</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2">
                    <Label htmlFor="template">Choose a Template</Label>
                    <Select onValueChange={handleTemplateSelect} value={selectedTemplate?.id || ''}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an agent template" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center">
                              <span className="mr-2">{template.icon}</span>
                              {template.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="agent-name">Agent Name</Label>
                    <Input id="agent-name" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="agent-description">Description</Label>
                    <Textarea id="agent-description" value={newAgentDescription} onChange={(e) => setNewAgentDescription(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="agent-system-prompt">System Prompt</Label>
                    <Textarea id="agent-system-prompt" value={newAgentSystemPrompt} onChange={(e) => setNewAgentSystemPrompt(e.target.value)} />
                  </div>
                  {selectedTemplate && (
                    <>
                      <div className="col-span-1">
                        <Label htmlFor="agent-model">Model</Label>
                        <Input id="agent-model" value={selectedTemplate.defaultConfig.model} readOnly />
                      </div>
                      <div className="col-span-1">
                        <Label htmlFor="agent-temperature">Temperature</Label>
                        <Input id="agent-temperature" type="number" value={selectedTemplate.defaultConfig.temperature} readOnly />
                      </div>
                      <div className="col-span-1">
                        <Label htmlFor="agent-max-tokens">Max Tokens</Label>
                        <Input id="agent-max-tokens" type="number" value={selectedTemplate.defaultConfig.maxTokens} readOnly />
                      </div>
                      <div className="col-span-1">
                        <Label htmlFor="agent-tools">Tools</Label>
                        <Input id="agent-tools" value={selectedTemplate.suggestedTools.join(', ')} readOnly />
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <h3 className="text-lg font-semibold mb-2">Workflow Configuration</h3>
                    <p className="text-sm text-gray-500 mb-4">Configure your agent's workflow below.</p>
                    {selectedTemplate && (
                      <WorkflowBuilder
                        initialPrompt={selectedTemplate.systemPrompt}
                        initialTools={selectedTemplate.suggestedTools}
                        onSave={(workflowConfig) => {
                          console.log("Workflow saved:", workflowConfig);
                        }}
                      />
                    )}
                  </div>
                </div>
                <DialogHeader className="flex justify-end p-0">
                  <Button onClick={handleCreateAgent} disabled={!newAgentName || !selectedTemplate}>
                    Create Agent
                  </Button>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(agent.type)}</span>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {agent.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(agent.status)} text-xs`}>
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Model:</span>
                    <span className="font-medium">{agent.config.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium capitalize">{agent.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tools:</span>
                    <span className="font-medium">{agent.config.tools.length}</span>
                  </div>

                  <div className="flex gap-2 pt-3">
                    {agent.status === 'active' ? (
                      <Button size="sm" variant="outline" className="flex-1">
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1">
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Archive className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Zap className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}