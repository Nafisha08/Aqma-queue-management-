import React from 'react'
import './FloatingParticles.css'

function FloatingParticles() {
  return (
    <div className="floating-particles">
      {[...Array(30)].map((_, i) => (
        <span key={i} className="particle" />
      ))}
    </div>
  )
}

export default FloatingParticles
