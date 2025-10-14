import React, { useState, useEffect } from 'react';
import Canvas from '../components/Canvas';
import Toolbar from '../components/Toolbar';
import '../styles/canvas.css';

const CanvasPage: React.FC = () => {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 800,
    height: 600,
  });

  // Responsive canvas sizing
  useEffect(() => {
    const updateDimensions = () => {
      // Calculate canvas size based on available space
      const toolbar = document.querySelector('.toolbar');
      const toolbarWidth = toolbar ? toolbar.clientWidth : 280;
      
      const width = Math.max(400, window.innerWidth - toolbarWidth - 40);
      const height = Math.max(300, window.innerHeight - 100);
      
      setCanvasDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <div className="canvas-page">
      <header className="canvas-header">
        <h1>Collab Canvas</h1>
        <p>Collaborative drawing with rectangles • 5,000×5,000 canvas</p>
      </header>
      
      <div className="canvas-workspace">
        <Toolbar />
        <div className="canvas-area">
          <Canvas 
            width={canvasDimensions.width}
            height={canvasDimensions.height}
          />
        </div>
      </div>
    </div>
  );
};

export default CanvasPage;
