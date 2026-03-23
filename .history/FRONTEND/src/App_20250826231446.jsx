import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [jokes, setjokes] = useState(0)

  return (
    <>
      <h1>chai and full stack</h1>
      <p>JOKES:{jokes.length}</p>
      {
        jokes.map((joke, index) => {
          <div></div>
        })
      }
    </>
  )
}

export default App
