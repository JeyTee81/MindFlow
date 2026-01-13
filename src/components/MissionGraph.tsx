import { useCallback, useMemo } from 'react'
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
} from 'reactflow'
import 'reactflow/dist/style.css'
import TaskNode from './TaskNode'
import { useMissionStore } from '../store/useMissionStore'

const nodeTypes = {
  task: TaskNode,
}

export default function MissionGraph() {
  const { currentMission } = useMissionStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  useMemo(() => {
    if (!currentMission) return

    const taskNodes: Node[] = currentMission.tasks.map((task, index) => {
      const statusColors = {
        planned: '#3b82f6',
        in_progress: '#eab308',
        completed: '#22c55e',
      }

      return {
        id: task.id,
        type: 'task',
        position: {
          x: (index % 3) * 300 + 100,
          y: Math.floor(index / 3) * 200 + 100,
        },
        data: {
          ...task,
          statusColor: statusColors[task.status],
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
      nodeTypes={nodeTypes}
      fitView
      className="bg-dark-blue"
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
