import { useState } from 'react'
import './App.css'

import Pose from './components/Pose'
import Start from './components/Start'

function App() {
  return (
    <div className="min-h-screen text-flexoki-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="main-title text-4xl font-bold text-center mb-8">Punch-Out!! AI Trainer</h1>
        
        <div className="flex flex-col items-center gap-8">
          <div className="w-full max-w-5xl card p-6 rounded-lg shadow-lg">
            <div className="w-full max-w-4xl flex flex-col items-center">
              <Start />
            </div>
            <h2 className="section-title text-2xl font-semibold mb-4">Pose Detection</h2>
            <Pose />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App