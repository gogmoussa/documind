import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';


export const getLayoutedElements = (nodes: Node[], edges: Edge[], options: { direction: string, ranksep?: number, nodesep?: number } = { direction: 'LR' }) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = options.direction === 'LR' || options.direction === 'RL';
    dagreGraph.setGraph({
        rankdir: options.direction,
        ranksep: options.ranksep || 100,
        nodesep: options.nodesep || 50
    });

    nodes.forEach((node) => {
        // Architecture nodes are 200 wide, groups are larger
        const width = node.type === 'architectureNode' ? 200 : 300;
        const height = node.type === 'architectureNode' ? 100 : 200;
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const width = node.type === 'architectureNode' ? 200 : 300;
        const height = node.type === 'architectureNode' ? 100 : 200;

        return {
            ...node,
            targetPosition: options.direction === 'LR' ? Position.Left : options.direction === 'RL' ? Position.Right : options.direction === 'TB' ? Position.Top : Position.Bottom,
            sourcePosition: options.direction === 'LR' ? Position.Right : options.direction === 'RL' ? Position.Left : options.direction === 'TB' ? Position.Bottom : Position.Top,
            position: {
                x: nodeWithPosition.x - width / 2,
                y: nodeWithPosition.y - height / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};
