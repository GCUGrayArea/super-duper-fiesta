import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addShape, deleteShape } from '../store/canvasSlice';

const Toolbar: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedShapeId, viewportCenter } = useSelector((state: RootState) => state.canvas);

  const createRectangle = () => {
    // Generate a random color for the rectangle
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    dispatch(addShape({
      type: 'rectangle',
      x: viewportCenter.x - 50, // Center in viewport
      y: viewportCenter.y - 50,
      width: 100,
      height: 100,
      fill: randomColor,
      createdBy: 'user', // This will be replaced with actual user ID later
    }));
  };

  const createCircle = () => {
    // Generate a random color for the circle
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    dispatch(addShape({
      type: 'circle',
      x: viewportCenter.x - 50, // Center in viewport
      y: viewportCenter.y - 50,
      width: 100, // Will be used to calculate radius
      height: 100,
      fill: randomColor,
      createdBy: 'user', // This will be replaced with actual user ID later
    }));
  };

  const createText = () => {
    // Generate a random color for the text
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    dispatch(addShape({
      type: 'text',
      x: viewportCenter.x - 25, // Center in viewport
      y: viewportCenter.y - 10,
      width: 50, // Initial square size
      height: 50,
      fill: randomColor,
      text: 'Text',
      createdBy: 'user', // This will be replaced with actual user ID later
    }));
  };

  const deleteSelectedShape = () => {
    if (selectedShapeId) {
      dispatch(deleteShape(selectedShapeId));
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h3>Tools</h3>
        <button 
          className="toolbar-btn primary"
          onClick={createRectangle}
        >
          ⬜ Create Rectangle
        </button>
        <button 
          className="toolbar-btn primary"
          onClick={createCircle}
        >
          ⭕ Create Circle
        </button>
        <button 
          className="toolbar-btn primary"
          onClick={createText}
        >
          📝 Create Text
        </button>
      </div>

      {selectedShapeId && (
        <div className="toolbar-section">
          <h3>Selected Shape</h3>
          <button 
            className="toolbar-btn danger"
            onClick={deleteSelectedShape}
          >
            🗑️ Delete
          </button>
        </div>
      )}

      <div className="toolbar-section">
        <h3>Info</h3>
        <p className="toolbar-info">
          Canvas: 5,000 × 5,000 px
        </p>
        <p className="toolbar-info">
          Shapes: {Object.keys(useSelector((state: RootState) => state.canvas.shapes)).length}
        </p>
      </div>
    </div>
  );
};

export default Toolbar;
