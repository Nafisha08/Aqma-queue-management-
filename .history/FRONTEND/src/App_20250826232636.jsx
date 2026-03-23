import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import axios from 'axios'
import { useEffect } from 'react'
function App() {
  const [jokes, setjokes] = useState([])
  useEffect(() => {
    axios.get('http://localhost:4000/jokes')
      .then((response) => {
        setjokes(response.data)
      })
      .catch((error) => {
      
    })
   
  })
  return (
    <>
      <h1>chai and full stack</h1>
      <p>JOKES:{jokes.length}</p>
      {
        jokes.map((joke, index) => {
          <div key= {joke.id}>
            <h3>{joke.title}</h3>
            <p>{joke.contenet }</p>
          </div>
        })
      }
    </>
  )
}

export default App
