import { NodeData, nodeType } from "../utils/types";
import { BasicNode } from "./BasicNode";

type NodeTypeSwitcherProps = {
  node: NodeData;
  updateFocusedIndex(index: number): void;
  isFocused: boolean;
  index: number;
}

const TEXT_NODE_TYPES: nodeType[] = ["text", "list", "heading1", "heading2", "heading3"]

export const NodeTypeSwitcher = ({ node, updateFocusedIndex, index, isFocused }: NodeTypeSwitcherProps) => {
  if (TEXT_NODE_TYPES.includes(node.type)) {
    return <BasicNode
      node={node}
      index={index}
      isFocused={isFocused}
      updateFocusedIndex={updateFocusedIndex}
    />
  }
  return null
}

