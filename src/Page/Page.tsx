import { useFocusedNodeIndex } from "./useFocusedNodeIndex"
import { Cover } from "./Cover"
import { Title } from "./Title"
import { BasicNode } from "../Node/BasicNode"
import { Spacer } from "./Spacer"
import { nanoid } from "nanoid"
import { useAppState } from "../state/AppStateContext"

export const Page = () => {
  const {nodes,addNode,title,setTitle} = useAppState()
  const [focusedNodeIndex, setFocusedNodeIndex] = useFocusedNodeIndex({ nodes })

  return (
    <>
      <Cover />
      <div>
        <Title addNode={addNode} title={title} changePageTitle={setTitle} />
        {nodes.map((node, index) => (
          <BasicNode
            key={node.id}
            node={node}
            isFocused={focusedNodeIndex === index}
            updateFocusedIndex={setFocusedNodeIndex}
            index={index}
          />
        ))}
        <Spacer
          handleClick={()=>{
            addNode({type:"text",value:"",id:nanoid()},nodes.length)
          }}
          showHint={!nodes.length}
        />
      </div>
    </>
  )
}
