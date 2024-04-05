import { ChangeEventHandler, useRef } from "react"
import styles from "./Cover.module.css"
export const Cover =()=>{
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onChangeCoverImage = ()=>{
    fileInputRef.current?.click()

  }
  const onCoverImageUpload:ChangeEventHandler<HTMLInputElement> = (event)=>{
    const target = event.target
    console.log(target.files?.[0])
    
  }
  return (
  <div className={styles.cover}>
      <button className={styles.button} onClick={onChangeCoverImage}>
      <img src="/ztm-notes.png" alt="Cover" className={styles.image} />
      </button>
      <input onChange={onCoverImageUpload} style={{display:"none"}} ref={fileInputRef} type="file" />

    </div>
  )
}
