import { useState } from 'react'
import './App.css'

import Pose from './components/Pose'
// import Start from './components/Start'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen">
      <Pose />
      <h1>Play Punch-Out!!</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      {/* <Start /> */}
    </div>
  )
}

export default App