import { useCallback, useEffect, type MouseEvent } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import TaskNode from './TaskNode'
import { useMissionStore, type Task } from '../store/useMissionStore'

const nodeTypes = {
  task: TaskNode,
}

/**
 * Hooks React Flow doivent être sous ReactFlowProvider — sinon graphe vide.
 */
function MissionFlowInner() {
  const { currentMission, openTaskDetail } = useMissionStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeDoubleClick = useCallback(
    (_e: MouseEvent, node: Node) => {
      openTaskDetail(node.id)
    },
    [openTaskDetail]
  )

  useEffect(() => {
    if (!currentMission) {
      setNodes([])
      setEdges([])
      return
    }

    const statusColors: Record<string, string> = {
      planned: '#3b82f6',
      in_progress: '#eab308',
      completed: '#22c55e',
    }

    const taskNodes: Node[] = currentMission.tasks.map((task, index) => {
      const st = task.status in statusColors ? task.status : 'planned'
      return {
        id: task.id,
        type: 'task',
        position: {
          x: (index % 3) * 320 + 40,
          y: Math.floor(index / 3) * 220 + 40,
        },
        data: {
          ...task,
          status: st as Task['status'],
          statusColor: statusColors[st] ?? statusColors.planned,
        },
      }
    })

    const taskEdges: Edge[] = []
    currentMission.tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach((depId) => {
          taskEdges.push({
            id: `${depId}-${task.id}`,
            source: depId,
            target: task.id,
            animated: task.status === 'in_progress',
            style: { stroke: '#3b82f6', strokeWidth: 2 },
          })
        })
      }
    })

    setNodes(taskNodes)
    setEdges(taskEdges)
  }, [currentMission, setNodes, setEdges])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDoubleClick={onNodeDoubleClick}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesUpdatable={false}
      elementsSelectable
      fitView
      className="bg-dark-blue"
      style={{ width: '100%', height: '100%' }}
    >
      <Background color="#1a2332" gap={16} />
      <Controls className="bg-night-blue border-blue-500/20" />
      <MiniMap
        className="bg-night-blue border-blue-500/20"
        nodeColor={(node) => {
          const status = node.data?.status
          if (status === 'completed') return '#22c55e'
          if (status === 'in_progress') return '#eab308'
          return '#3b82f6'
        }}
      />
    </ReactFlow>
  )
}

export default function MissionGraph() {
  return (
    <div className="h-full w-full min-h-[320px] md:min-h-[calc(100dvh-7rem)]">
      <ReactFlowProvider>
        <MissionFlowInner />
      </ReactFlowProvider>
    </div>
  )
}
