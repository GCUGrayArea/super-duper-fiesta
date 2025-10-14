import React, { useEffect, useRef } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, IText, Point } from 'fabric';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  setFabricCanvas,
  moveShape,
  resizeShape,
  selectShape,
  updateZoom,
  updateShapeText,
} from '../store/canvasSlice';

interface CanvasProps {
  width?: number;
  height?: number;
}

// Extended canvas interface for custom properties
interface ExtendedCanvas extends FabricCanvas {
  isDragging?: boolean;
  lastPosX?: number;
  lastPosY?: number;
}

  const Canvas: React.FC<CanvasProps> = ({ 
    width = 800, 
    height = 600 
  }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<ExtendedCanvas | null>(null);
  const dispatch = useDispatch();
  
  const { shapes } = useSelector((state: RootState) => state.canvas);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new FabricCanvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
        selection: true,
      });

      // Set canvas dimensions to 5000x5000 for virtual space
      canvas.setDimensions({
        width: 5000,
        height: 5000,
      });

      // Set viewport dimensions to actual container size
      canvas.setDimensions({
        width,
        height,
      }, {
        backstoreOnly: false,
      });

      // Enable pan and zoom
      canvas.on('mouse:wheel', (opt) => {
        const event = opt.e as WheelEvent;
        const delta = event.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        
        const point = new Point(event.offsetX, event.offsetY);
        canvas.zoomToPoint(point, zoom);
        
        dispatch(updateZoom(zoom));
        event.preventDefault();
        event.stopPropagation();
      });

      // Pan functionality
      const extendedCanvas = canvas as ExtendedCanvas;
      
      canvas.on('mouse:down', (opt) => {
        const evt = opt.e as MouseEvent;
        if (evt.altKey === true) {
          extendedCanvas.isDragging = true;
          canvas.selection = false;
          extendedCanvas.lastPosX = evt.clientX;
          extendedCanvas.lastPosY = evt.clientY;
        }
      });

      canvas.on('mouse:move', (opt) => {
        if (extendedCanvas.isDragging) {
          const e = opt.e as MouseEvent;
          const vpt = canvas.viewportTransform;
          if (vpt && extendedCanvas.lastPosX && extendedCanvas.lastPosY) {
            vpt[4] += e.clientX - extendedCanvas.lastPosX;
            vpt[5] += e.clientY - extendedCanvas.lastPosY;
            canvas.requestRenderAll();
            extendedCanvas.lastPosX = e.clientX;
            extendedCanvas.lastPosY = e.clientY;
          }
        }
      });

      canvas.on('mouse:up', () => {
        if (canvas.viewportTransform) {
          canvas.setViewportTransform(canvas.viewportTransform);
        }
        extendedCanvas.isDragging = false;
        canvas.selection = true;
      });

      // Object selection events
      canvas.on('selection:created', (e) => {
        if (e.selected && e.selected.length === 1) {
          const object = e.selected[0] as any;
          if (object.shapeId) {
            dispatch(selectShape(object.shapeId));
          }
        }
      });

      canvas.on('selection:updated', (e) => {
        if (e.selected && e.selected.length === 1) {
          const object = e.selected[0] as any;
          if (object.shapeId) {
            dispatch(selectShape(object.shapeId));
          }
        }
      });

      canvas.on('selection:cleared', () => {
        dispatch(selectShape(null));
      });

      // Handle text editing completion
      canvas.on('text:editing:exited', (e) => {
        const object = e.target as any;
        if (object && object.shapeId) {
          // Just update text content in Redux, no resizing
          dispatch(updateShapeText({
            id: object.shapeId,
            text: object.text || '',
          }));
        }
      });

      // Bring shape to front when dragging starts
      canvas.on('mouse:down', (e) => {
        if (e.target && (e.target as any).shapeId) {
          const object = e.target as any;
          // Bring the selected object to front
          canvas.bringObjectToFront(object);
          canvas.renderAll();
        }
      });

      // Handle double-click for text editing
      canvas.on('mouse:dblclick', (e) => {
        if (e.target && (e.target as any).shapeId) {
          const object = e.target as any;
          // Double-click on text enters edit mode
          if (object.type === 'i-text') {
            object.enterEditing();
          }
        }
      });

      // Update position during dragging (throttled to avoid too many Redux updates)
      let dragTimeout: NodeJS.Timeout | null = null;
      canvas.on('object:moving', (e) => {
        const object = e.target as any;
        if (object && object.shapeId) {
          // Throttle Redux updates during dragging to avoid interference
          if (dragTimeout) clearTimeout(dragTimeout);
          dragTimeout = setTimeout(() => {
            dispatch(moveShape({
              id: object.shapeId,
              x: object.left || 0,
              y: object.top || 0,
              isDragging: true,
            }));
          }, 50); // Update every 50ms instead of every mouse move
        }
      });

      // Object modification events
      canvas.on('object:modified', (e) => {
        const object = e.target as any;
        if (object && object.shapeId) {
          const shapeId = object.shapeId;
          
          // Calculate the actual scaled dimensions
          let newWidth, newHeight;
          
          if (object.type === 'circle') {
            // For circles, calculate based on radius and scale
            const scaledRadius = (object.radius || 0) * Math.max(object.scaleX || 1, object.scaleY || 1);
            newWidth = scaledRadius * 2;
            newHeight = scaledRadius * 2;
            
            // Reset the scale factors to prevent double scaling
            object.set({
              radius: scaledRadius,
              scaleX: 1,
              scaleY: 1,
            });
          } else if (object.type === 'i-text') {
            // For text, calculate based on scaled dimensions but don't force square
            newWidth = (object.width || 0) * (object.scaleX || 1);
            newHeight = (object.height || 0) * (object.scaleY || 1);
            
            // Reset the scale factors to prevent double scaling
            object.set({
              width: newWidth,
              height: newHeight,
              fixedWidth: newWidth, // Update fixed width for proper wrapping
              scaleX: 1,
              scaleY: 1,
            });
          } else {
            // For rectangles, calculate based on width/height and scale
            newWidth = (object.width || 0) * (object.scaleX || 1);
            newHeight = (object.height || 0) * (object.scaleY || 1);
            
            // Reset the scale factors to prevent double scaling
            object.set({
              width: newWidth,
              height: newHeight,
              scaleX: 1,
              scaleY: 1,
            });
          }
          
          dispatch(moveShape({
            id: shapeId,
            x: object.left || 0,
            y: object.top || 0,
            isDragging: false, // Final position update, not actively dragging
          }));

          dispatch(resizeShape({
            id: shapeId,
            width: newWidth,
            height: newHeight,
          }));
          
          canvas.renderAll();
        }
      });

      fabricCanvasRef.current = extendedCanvas;
      dispatch(setFabricCanvas(extendedCanvas));

      // Set initial viewport to center
      canvas.setViewportTransform([1, 0, 0, 1, -2000, -2000]);
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [width, height, dispatch]);

  // Sync Redux shapes with Fabric canvas
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const currentObjects = canvas.getObjects();
    const activeObject = canvas.getActiveObject(); // Don't interfere with selected objects
    
    // Remove objects that no longer exist in Redux
    currentObjects.forEach((obj: any) => {
      if (obj.shapeId && !shapes[obj.shapeId]) {
        canvas.remove(obj);
      }
    });

    // Add new objects that don't exist in canvas yet
    Object.values(shapes).forEach((shape) => {
      const existingObj = currentObjects.find(
        (obj: any) => obj.shapeId === shape.id
      );

      if (!existingObj) {
        // Create new Fabric object
        let newObj: any;
        if (shape.type === 'rectangle') {
          newObj = new Rect({
            left: shape.x,
            top: shape.y,
            width: shape.width,
            height: shape.height,
            fill: shape.fill,
            stroke: '#000000',
            strokeWidth: 1,
          });
        } else if (shape.type === 'circle') {
          newObj = new Circle({
            left: shape.x,
            top: shape.y,
            radius: Math.min(shape.width, shape.height) / 2,
            fill: shape.fill,
            stroke: '#000000',
            strokeWidth: 1,
          });
        } else if (shape.type === 'text') {
          newObj = new IText(shape.text || 'Text', {
            left: shape.x,
            top: shape.y,
            fontSize: 12,
            fill: shape.fill,
            fontFamily: 'Arial',
            width: shape.width,
            height: shape.height,
            textAlign: 'left',
            splitByGrapheme: true,
            editable: true,
            // Enable text wrapping to box width
            breakWords: true,
            // Make sure text wraps within the defined width
            fixedWidth: shape.width,
          });
        }

        if (newObj) {
          newObj.shapeId = shape.id;
          canvas.add(newObj);
        }
      } else {
        // Update existing object properties (only if not currently selected/dragging)
        if (existingObj !== activeObject) {
          if (shape.type === 'rectangle') {
            existingObj.set({
              left: shape.x,
              top: shape.y,
              width: shape.width,
              height: shape.height,
              fill: shape.fill,
              scaleX: 1,
              scaleY: 1,
            });
          } else if (shape.type === 'circle') {
            existingObj.set({
              left: shape.x,
              top: shape.y,
              radius: Math.min(shape.width, shape.height) / 2,
              fill: shape.fill,
              scaleX: 1,
              scaleY: 1,
            });
          } else if (shape.type === 'text') {
            // Only update if not currently editing (check via active object)
            const isCurrentlyEditing = canvas.getActiveObject() === existingObj && 
                                     (existingObj as any).isEditing;
            if (!isCurrentlyEditing) {
              existingObj.set({
                left: shape.x,
                top: shape.y,
                text: shape.text || 'Text',
                fill: shape.fill,
                width: shape.width,
                height: shape.height,
                fixedWidth: shape.width, // Ensure text wraps to box width
                scaleX: 1,
                scaleY: 1,
              });
            }
          }
        }
      }
    });

    canvas.renderAll();
  }, [shapes]);

  // Separate effect for managing z-order without interfering with dragging
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    
    // Only reorder if no object is currently being manipulated
    if (!activeObject) {
      const currentObjects = canvas.getObjects();
      
      // Sort shapes by z-order (most recently dragged on top)
      const sortedShapes = Object.values(shapes).sort((a, b) => {
        const aTime = a.lastDragged || a.createdAt;
        const bTime = b.lastDragged || b.createdAt;
        return aTime - bTime; // Earlier times first (will be at back)
      });

      // Reorder objects in canvas to match sorted order
      // First, send all objects to back in reverse order
      sortedShapes.reverse().forEach((shape) => {
        const obj = currentObjects.find((obj: any) => obj.shapeId === shape.id);
        if (obj) {
          canvas.sendObjectToBack(obj);
        }
      });

      canvas.renderAll();
    }
  }, [shapes]);


  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} />
      <div className="canvas-controls">
        <p>Hold Alt + drag to pan • Scroll to zoom • Double-click text to edit</p>
      </div>
    </div>
  );
};

export default Canvas;
