// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import { nanoid } from 'nanoid'
import './App.css'
import { Page } from './Page/Page'
import { AppStateProvider } from './state/AppStateContext'

const createPage = ()=>{
  const slug = nanoid()
  const id = nanoid()
  const page = {
    title:"Untitled",
    id,
    slug,
    nodes:[],
    cover:"ztm-cover.png"
  }
  return page
}

const initialState =createPage()

function App() {
  // const [count, setCount] = useState(0)
  return (
  <AppStateProvider initialState={initialState}  >
      <Page></Page>
    </AppStateProvider>
  )
}

export default App
