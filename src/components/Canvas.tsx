import React, { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  selectCanvasObjects, 
  selectViewport, 
  selectSelection,
  selectSelectedObject,
  addRectangle,
  selectObject,
  updateObject,
  bringToFront,
  panViewport,
  zoomViewport,
  deleteObject
} from '../store/canvasSlice';
import { CANVAS_CONFIG, Rectangle, isRectangle } from '../types/canvas';
import { calculateViewportCenter, findOverlappingObjects } from '../utils/canvasObjects';

interface CanvasProps {
  width?: number;
  height?: number;
  onNotification?: (message: string, type?: 'info' | 'warning' | 'error' | 'success') => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  width = CANVAS_CONFIG.VIEWPORT_WIDTH,
  height = CANVAS_CONFIG.VIEWPORT_HEIGHT,
  onNotification,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const isInternalSelectionRef = useRef(false); // Flag to prevent infinite loops

  const dispatch = useAppDispatch();
  const objects = useAppSelector(selectCanvasObjects);
  const viewport = useAppSelector(selectViewport);
  const selection = useAppSelector(selectSelection);
  const selectedObject = useAppSelector(selectSelectedObject);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#f8f9fa',
      selection: true, // Enable Fabric.js selection
      preserveObjectStacking: true,
      interactive: true,
      allowTouchScrolling: false,
    });

    fabricCanvasRef.current = canvas;

    // Set initial viewport
    updateFabricViewport(canvas, viewport);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [width, height]);

  // Update Fabric.js viewport when Redux viewport changes
  const updateFabricViewport = useCallback((canvas: fabric.Canvas, viewportState: typeof viewport) => {
    const { x, y, zoom } = viewportState;
    
    // Calculate viewport transformation
    // Fabric.js uses top-left origin, we want center-based coordinates
    const viewportLeft = x - (width / 2) / zoom;
    const viewportTop = y - (height / 2) / zoom;
    
    canvas.setViewportTransform([
      zoom, 0, 0, zoom,
      -viewportLeft * zoom,
      -viewportTop * zoom
    ]);
    
    canvas.requestRenderAll();
  }, [width, height]);

  // Sync viewport changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      updateFabricViewport(fabricCanvasRef.current, viewport);
    }
  }, [viewport, updateFabricViewport]);

  // Convert Redux objects to Fabric.js objects
  const createFabricObject = useCallback((obj: Rectangle): fabric.Rect => {
    const rect = new fabric.Rect({
      left: obj.x,
      top: obj.y,
      width: obj.width,
      height: obj.height,
      fill: obj.fill,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      opacity: obj.opacity,
      angle: obj.rotation, // Apply rotation
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerStyle: 'rect',
      cornerSize: 10,
      borderColor: '#007bff',
      cornerColor: '#007bff',
      transparentCorners: false,
      lockRotation: false, // Enable rotation
    });

    // Store object ID for reference
    rect.set('objectId', obj.id);
    
    return rect;
  }, []);

  // Sync Redux objects to Fabric.js canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Clear existing objects
    canvas.clear();
    canvas.backgroundColor = '#f8f9fa';

    // Add objects sorted by z-index
    const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);
    
    sortedObjects.forEach(obj => {
      if (isRectangle(obj)) {
        const fabricObj = createFabricObject(obj);
        canvas.add(fabricObj);
      }
    });

    // Update selection (prevent infinite loop with internal flag)
    isInternalSelectionRef.current = true;
    canvas.discardActiveObject();
    if (selection.selectedObjectId) {
      const fabricObj = canvas.getObjects().find(
        (obj: fabric.Object) => (obj as any).objectId === selection.selectedObjectId
      );
      if (fabricObj) {
        canvas.setActiveObject(fabricObj);
      }
    }
    
    // Reset flag after a brief delay to ensure all events are processed
    setTimeout(() => {
      isInternalSelectionRef.current = false;
    }, 0);

    canvas.requestRenderAll();
  }, [objects, selection.selectedObjectId, createFabricObject]);

  // Handle object selection
  const handleObjectSelection = useCallback((e: any) => {
    // Skip if this is an internal/programmatic selection to prevent infinite loops
    if (isInternalSelectionRef.current) {
      return;
    }
    
    const target = e.target || e.selected?.[0];
    if (target && (target as any).objectId) {
      const objectId = (target as any).objectId;
      dispatch(selectObject(objectId));
      // Bring selected object to front
      dispatch(bringToFront(objectId));
    }
  }, [dispatch]);

  // Handle canvas click (deselect if clicking empty area)
  const handleCanvasClick = useCallback((e: any) => {
    // Skip if this is an internal operation
    if (isInternalSelectionRef.current) {
      return;
    }
    
    if (!e.target) {
      dispatch(selectObject(null));
    }
  }, [dispatch]);


  // Handle object movement during drag
  const handleObjectMoving = useCallback((_e: any) => {
    // Don't update Redux during drag - it causes interruption
    // We'll update on drag end instead
  }, []);

  // Handle object modification (resize, rotate, etc.) AND movement completion
  const handleObjectModified = useCallback((e: any) => {
    const target = e.target;
    if (target && (target as any).objectId) {
      const objectId = (target as any).objectId;
      
      // Bring to front when modifying or after moving
      dispatch(bringToFront(objectId));
      
      dispatch(updateObject({
        id: objectId,
        updates: {
          x: target.left || 0,
          y: target.top || 0,
          width: (target.width || 0) * (target.scaleX || 1),
          height: (target.height || 0) * (target.scaleY || 1),
          rotation: target.angle || 0, // Capture rotation angle
        },
      }));
      
      // Reset scale after updating dimensions
      target.set({ scaleX: 1, scaleY: 1 });
    }
  }, [dispatch]);

  // Handle mouse up on canvas to sync object positions after drag
  const handleObjectMouseUp = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject as any).objectId) {
      const objectId = (activeObject as any).objectId;
      
      // Update position and rotation after drag ends
      dispatch(updateObject({
        id: objectId,
        updates: {
          x: activeObject.left || 0,
          y: activeObject.top || 0,
          rotation: activeObject.angle || 0, // Capture any rotation changes
        },
      }));
    }
  }, [dispatch]);

  // Handle mouse wheel for zooming
  const handleMouseWheel = useCallback((e: any) => {
    const event = e.e as WheelEvent;
    event.preventDefault();

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const pointer = canvas.getPointer(event);
    const delta = event.deltaY > 0 ? -1 : 1; // Invert for natural scrolling

    // Convert screen coordinates to world coordinates
    const zoom = viewport.zoom;
    const worldX = viewport.x + (pointer.x - width / 2) / zoom;
    const worldY = viewport.y + (pointer.y - height / 2) / zoom;

    dispatch(zoomViewport({
      delta,
      centerX: worldX,
      centerY: worldY,
    }));
  }, [dispatch, viewport, width, height]);

  // Handle mouse down for panning (only on empty canvas)
  const handleCanvasMouseDown = useCallback((e: any) => {
    const event = e.e as MouseEvent;
    
    // Only start panning if clicking empty area (no target object)
    if (!e.target && !e.subTargets?.length) {
      isPanningRef.current = true;
      lastPanPointRef.current = { x: event.clientX, y: event.clientY };
      
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.defaultCursor = 'grabbing';
        fabricCanvasRef.current.hoverCursor = 'grabbing';
      }
    }
  }, []);

  // Handle mouse move for panning (only when panning is active)
  const handleCanvasMouseMove = useCallback((e: any) => {
    if (!isPanningRef.current || !lastPanPointRef.current) return;

    const event = e.e as MouseEvent;
    const deltaX = (lastPanPointRef.current.x - event.clientX) / viewport.zoom;
    const deltaY = (lastPanPointRef.current.y - event.clientY) / viewport.zoom;

    dispatch(panViewport({ deltaX, deltaY }));

    lastPanPointRef.current = { x: event.clientX, y: event.clientY };
  }, [dispatch, viewport.zoom]);

  // Handle mouse up for panning
  const handleCanvasMouseUp = useCallback(() => {
    isPanningRef.current = false;
    lastPanPointRef.current = null;

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.defaultCursor = 'default';
      fabricCanvasRef.current.hoverCursor = 'move';
    }
  }, []);

  // Add Fabric.js event listeners
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.on('selection:created', handleObjectSelection);
    canvas.on('selection:updated', handleObjectSelection);
    canvas.on('mouse:down', handleCanvasClick);
    canvas.on('mouse:wheel', handleMouseWheel);
    
    // Object manipulation events
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('mouse:up', handleObjectMouseUp);
    
    // Canvas panning events (only for empty areas)
    canvas.on('mouse:down', handleCanvasMouseDown);
    canvas.on('mouse:move', handleCanvasMouseMove);
    canvas.on('mouse:up', handleCanvasMouseUp);

    return () => {
      canvas.off('selection:created', handleObjectSelection);
      canvas.off('selection:updated', handleObjectSelection);
      canvas.off('mouse:down', handleCanvasClick);
      canvas.off('mouse:wheel', handleMouseWheel);
      
      // Object manipulation events
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('mouse:up', handleObjectMouseUp);
      
      // Canvas panning events
      canvas.off('mouse:down', handleCanvasMouseDown);
      canvas.off('mouse:move', handleCanvasMouseMove);
      canvas.off('mouse:up', handleCanvasMouseUp);
    };
  }, [
    handleObjectSelection,
    handleCanvasClick,
    handleObjectMoving,
    handleObjectModified,
    handleObjectMouseUp,
    handleMouseWheel,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  ]);

  // Handle keyboard events for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject) {
        e.preventDefault();
        dispatch(deleteObject(selectedObject.id));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, dispatch]);

  // Add rectangle function
  const handleAddRectangle = useCallback(() => {
    const center = calculateViewportCenter(viewport, width, height);
    
    // Check for overlaps with new rectangle position
    const tempRect: Rectangle = {
      id: 'temp',
      type: 'rectangle',
      x: center.x - CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH / 2,
      y: center.y - CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT / 2,
      width: CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH,
      height: CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT,
      fill: 'temp',
      stroke: 'black',
      strokeWidth: 1,
      opacity: 1.0,
      rotation: 0, // No rotation for new rectangle
      zIndex: 0,
      createdAt: 0,
      updatedAt: 0,
    };

    const overlapping = findOverlappingObjects(tempRect, objects);
    
    dispatch(addRectangle({
      x: center.x - CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH / 2,
      y: center.y - CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT / 2,
    }));

    // Show notification if overlaps detected
    if (overlapping.length > 0 && onNotification) {
      onNotification(
        'Shape overlaps with existing object and has been brought to front',
        'info'
      );
    }
  }, [viewport, width, height, objects, dispatch, onNotification]);

  // Expose add rectangle function
  useEffect(() => {
    (window as any).canvasAddRectangle = handleAddRectangle;
    return () => {
      delete (window as any).canvasAddRectangle;
    };
  }, [handleAddRectangle]);

  return (
    <div className="relative overflow-hidden border border-gray-300 rounded-lg">
      <canvas
        ref={canvasRef}
        className="block cursor-default"
      />
      
      {/* Viewport info overlay (development) */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        Viewport: {Math.round(viewport.x)}, {Math.round(viewport.y)} | Zoom: {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
};
