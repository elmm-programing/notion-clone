import { useEffect, useRef } from "react";
import { NodeData } from "../utils/types";
import styles from "./Title.module.css"
import {nanoid} from "nanoid"

type TitleProps = {
  title: string;
  changePageTitle(title: string): void;
  addNote(node: NodeData, index: number): void;
}
export const Title = ({ title, changePageTitle, addNote: addNode }: TitleProps) => {
  const headerRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const isFocused = document.activeElement == headerRef.current;
    if (!isFocused && headerRef.current) {
      headerRef.current.textContent = title;

    }

  }, [title])

  return (
    <div className={styles.container}>
      <h1 ref={headerRef} className={styles.title} contentEditable suppressContentEditableWarning
        onInput={(e) => changePageTitle(e.currentTarget.textContent || "")}
        onKeyDown={(event) => {
          if (event.key == 'Enter') {
            event.preventDefault()
            addNode({ type: "text", id: nanoid(), value: "" }, 0)
          }
        }}>

      </h1>
    </div>
  )
}
