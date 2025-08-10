
import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Play, Settings, Trash2, Webhook, Clock, Zap, Brain, MessageSquare, Database, GitBranch } from 'lucide-react';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'decision' | 'ai_process';
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

interface WorkflowBuilderProps {
  agentId?: string;
  onSave?: (workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
}

const nodeTypes = {
  trigger: {
    icon: Webhook,
    color: 'bg-blue-500',
    label: 'Trigger',
    subtypes: ['webhook', 'schedule', 'api_event']
  },
  action: {
    icon: Zap,
    color: 'bg-green-500',
    label: 'Action',
    subtypes: ['send_message', 'api_call', 'db_query', 'email']
  },
  decision: {
    icon: GitBranch,
    color: 'bg-yellow-500',
    label: 'Decision',
    subtypes: ['if_else', 'switch', 'filter']
  },
  ai_process: {
    icon: Brain,
    color: 'bg-purple-500',
    label: 'AI Process',
    subtypes: ['llm_prompt', 'summarizer', 'classifier', 'sentiment']
  }
};

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function NodePalette({ onAddNode }: { onAddNode: (type: keyof typeof nodeTypes) => void }) {
  return (
    <div className="w-64 border-r border-border p-4 bg-muted/50">
      <h3 className="text-lg font-semibold mb-4">Workflow Blocks</h3>
      <div className="space-y-2">
        {Object.entries(nodeTypes).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={type}
              variant="outline"
              className="w-full justify-start h-auto p-3"
              onClick={() => onAddNode(type as keyof typeof nodeTypes)}
            >
              <div className={`p-2 rounded ${config.color} text-white mr-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium">{config.label}</div>
                <div className="text-xs text-muted-foreground">
                  {config.subtypes.join(', ')}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function NodeEditor({ node, onUpdate, onDelete }: { 
  node: WorkflowNode; 
  onUpdate: (node: WorkflowNode) => void;
  onDelete: (nodeId: string) => void;
}) {
  const nodeConfig = nodeTypes[node.type];
  const Icon = nodeConfig.icon;

  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      ...node,
      config: { ...node.config, [key]: value }
    });
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'trigger':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Trigger Type</label>
              <Select 
                value={node.config.subtype || ''} 
                onValueChange={(value) => handleConfigChange('subtype', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  {nodeConfig.subtypes.map((subtype) => (
                    <SelectItem key={subtype} value={subtype}>
                      {subtype.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {node.config.subtype === 'webhook' && (
              <div>
                <label className="text-sm font-medium">Webhook URL</label>
                <Input
                  value={node.config.webhook_url || ''}
                  onChange={(e) => handleConfigChange('webhook_url', e.target.value)}
                  placeholder="/webhook/endpoint"
                />
              </div>
            )}
            {node.config.subtype === 'schedule' && (
              <div>
                <label className="text-sm font-medium">Cron Expression</label>
                <Input
                  value={node.config.cron || ''}
                  onChange={(e) => handleConfigChange('cron', e.target.value)}
                  placeholder="0 9 * * *"
                />
              </div>
            )}
          </div>
        );

      case 'action':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Action Type</label>
              <Select 
                value={node.config.subtype || ''} 
                onValueChange={(value) => handleConfigChange('subtype', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  {nodeConfig.subtypes.map((subtype) => (
                    <SelectItem key={subtype} value={subtype}>
                      {subtype.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {node.config.subtype === 'send_message' && (
              <>
                <div>
                  <label className="text-sm font-medium">Platform</label>
                  <Select 
                    value={node.config.platform || ''} 
                    onValueChange={(value) => handleConfigChange('platform', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Message Template</label>
                  <Textarea
                    value={node.config.message_template || ''}
                    onChange={(e) => handleConfigChange('message_template', e.target.value)}
                    placeholder="Hello {{name}}, your request has been processed."
                  />
                </div>
              </>
            )}
            {node.config.subtype === 'api_call' && (
              <>
                <div>
                  <label className="text-sm font-medium">API Endpoint</label>
                  <Input
                    value={node.config.api_endpoint || ''}
                    onChange={(e) => handleConfigChange('api_endpoint', e.target.value)}
                    placeholder="https://api.example.com/endpoint"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">HTTP Method</label>
                  <Select 
                    value={node.config.method || 'GET'} 
                    onValueChange={(value) => handleConfigChange('method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        );

      case 'decision':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Decision Type</label>
              <Select 
                value={node.config.subtype || ''} 
                onValueChange={(value) => handleConfigChange('subtype', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select decision type" />
                </SelectTrigger>
                <SelectContent>
                  {nodeConfig.subtypes.map((subtype) => (
                    <SelectItem key={subtype} value={subtype}>
                      {subtype.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {node.config.subtype === 'if_else' && (
              <div>
                <label className="text-sm font-medium">Condition</label>
                <Input
                  value={node.config.condition || ''}
                  onChange={(e) => handleConfigChange('condition', e.target.value)}
                  placeholder="data.status === 'active'"
                />
              </div>
            )}
          </div>
        );

      case 'ai_process':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">AI Process Type</label>
              <Select 
                value={node.config.subtype || ''} 
                onValueChange={(value) => handleConfigChange('subtype', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI process" />
                </SelectTrigger>
                <SelectContent>
                  {nodeConfig.subtypes.map((subtype) => (
                    <SelectItem key={subtype} value={subtype}>
                      {subtype.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {node.config.subtype === 'llm_prompt' && (
              <>
                <div>
                  <label className="text-sm font-medium">Model</label>
                  <Select 
                    value={node.config.model || ''} 
                    onValueChange={(value) => handleConfigChange('model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude-3">Claude 3</SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Prompt Template</label>
                  <Textarea
                    value={node.config.prompt_template || ''}
                    onChange={(e) => handleConfigChange('prompt_template', e.target.value)}
                    placeholder="Analyze the following text and provide insights: {{input_text}}"
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded ${nodeConfig.color} text-white`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <Input
                value={node.name}
                onChange={(e) => onUpdate({ ...node, name: e.target.value })}
                className="font-medium border-none p-0 h-auto bg-transparent"
                placeholder="Node name"
              />
              <Badge variant="secondary" className="text-xs">
                {nodeConfig.label}
              </Badge>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderConfigFields()}
      </CardContent>
    </Card>
  );
}

export default function WorkflowBuilder({ agentId, onSave }: WorkflowBuilderProps) {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addNode = useCallback((type: keyof typeof nodeTypes) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      name: `New ${nodeTypes[type].label}`,
      config: {},
      position: { x: 100, y: 100 }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode);
  }, []);

  const updateNode = useCallback((updatedNode: WorkflowNode) => {
    setNodes(prev => prev.map(node => 
      node.id === updatedNode.id ? updatedNode : node
    ));
    setSelectedNode(updatedNode);
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setNodes((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const executeWorkflow = async () => {
    setIsExecuting(true);
    try {
      // Simulate workflow execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Workflow executed successfully');
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const saveWorkflow = () => {
    const workflow = {
      nodes,
      edges: [] // TODO: Implement edge management
    };
    onSave?.(workflow);
  };

  return (
    <div className="flex h-screen bg-background">
      <NodePalette onAddNode={addNode} />
      
      <div className="flex-1 flex">
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Workflow Builder</h2>
            <div className="flex space-x-2">
              <Button onClick={executeWorkflow} disabled={isExecuting || nodes.length === 0}>
                <Play className="h-4 w-4 mr-2" />
                {isExecuting ? 'Executing...' : 'Test Run'}
              </Button>
              <Button onClick={saveWorkflow} disabled={nodes.length === 0}>
                Save Workflow
              </Button>
            </div>
          </div>

          {nodes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No workflow nodes</h3>
                <p>Start building your workflow by adding blocks from the sidebar.</p>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {nodes.map((node) => (
                    <SortableItem key={node.id} id={node.id}>
                      <div 
                        className={`cursor-pointer transition-all ${
                          selectedNode?.id === node.id 
                            ? 'ring-2 ring-primary' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedNode(node)}
                      >
                        <NodeEditor
                          node={node}
                          onUpdate={updateNode}
                          onDelete={deleteNode}
                        />
                      </div>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {selectedNode && (
          <div className="w-80 border-l border-border p-4 bg-muted/50 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Node Properties</h3>
            <NodeEditor
              node={selectedNode}
              onUpdate={updateNode}
              onDelete={deleteNode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
