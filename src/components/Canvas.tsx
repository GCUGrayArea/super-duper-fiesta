import React, { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  selectCanvasObjects, 
  selectViewport, 
  selectSelection,
  selectObject,
  updateObject,
  bringToFront,
  panViewport,
  zoomViewport
} from '../store/canvasSlice';
import { selectUser } from '../store/authSlice';
import { CANVAS_CONFIG, Rectangle, isRectangle } from '../types/canvas';
import { calculateViewportCenter, findOverlappingObjects, createRectangle } from '../utils/canvasObjects';
import { useCanvasSync } from '../hooks/useCanvasSync';

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
  const user = useAppSelector(selectUser);
  const objects = useAppSelector(selectCanvasObjects);
  const viewport = useAppSelector(selectViewport);
  const selection = useAppSelector(selectSelection);

  // Phase 4: Canvas sync integration
  const { isConnected, syncObject, addObject } = useCanvasSync({
    canvasId: 'main', // Use main canvas for MVP
    user: user!,
    enabled: !!user
  });

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

  // Convert Redux objects to Fabric.js objects (MVP: position and selection only)
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
      angle: obj.rotation,
      selectable: true,
      hasControls: false, // MVP: Disable resize controls
      hasBorders: true,
      borderColor: '#007bff',
      lockRotation: true, // MVP: Lock rotation
      lockScalingX: true, // MVP: Lock scaling
      lockScalingY: true, // MVP: Lock scaling
      lockMovementX: false, // Allow movement
      lockMovementY: false, // Allow movement
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
      // Bring selected object to front with sync
      if (user) {
        dispatch(bringToFront({ objectId, userId: user.uid }));
      }
    }
  }, [dispatch, user]);

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


  // MVP: Only handle movement (resize/rotation removed)
  const handleObjectMoving = useCallback((_e: any) => {
    // Don't update Redux during drag - it causes interruption
    // We'll update on drag end instead
  }, []);

  // Handle mouse up on canvas to sync object positions after drag (MVP: position only)
  const handleObjectMouseUp = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !user) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject && (activeObject as any).objectId) {
      const objectId = (activeObject as any).objectId;
      
      // Bring to front when dragging
      dispatch(bringToFront({ objectId, userId: user.uid }));
      
      const updates = {
        x: activeObject.left || 0,
        y: activeObject.top || 0,
      };
      
      // Update position after drag ends
      dispatch(updateObject({
        id: objectId,
        updates,
        userId: user.uid,
      }));
      
      // Sync with thresholds
      try {
        await syncObject(objectId, updates);
      } catch (error) {
        console.error('Failed to sync object position:', error);
      }
    }
  }, [dispatch, user, syncObject]);

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

  // Add Fabric.js event listeners (MVP: selection and movement only)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.on('selection:created', handleObjectSelection);
    canvas.on('selection:updated', handleObjectSelection);
    canvas.on('mouse:down', handleCanvasClick);
    canvas.on('mouse:wheel', handleMouseWheel);
    
    // MVP: Only movement events (resize/rotation removed)
    canvas.on('object:moving', handleObjectMoving);
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
      
      // MVP: Only movement events
      canvas.off('object:moving', handleObjectMoving);
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
    handleObjectMouseUp,
    handleMouseWheel,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  ]);

  // MVP: Delete functionality removed (will be added post-MVP)

  // Add rectangle function (Firebase-first: Firebase is single source of truth)
  const handleAddRectangle = useCallback(async () => {
    if (!user) return;
    
    // Calculate position at center of creator's current viewport
    const center = calculateViewportCenter(viewport, width, height);
    const rectX = center.x - CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH / 2;
    const rectY = center.y - CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT / 2;
    
    // Create the new rectangle using our utility function
    const newRectangle = createRectangle(rectX, rectY, user.uid, objects);
    
    // Check for overlaps (temporary rectangle for overlap detection only)
    const tempRect = {
      id: 'temp',
      type: 'rectangle' as const,
      x: rectX,
      y: rectY,
      width: CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH,
      height: CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT,
      fill: 'temp',
      stroke: 'black',
      strokeWidth: 1,
      opacity: 1.0,
      rotation: 0,
      zIndex: 0,
      createdAt: 0,
      updatedAt: 0,
      lastModifiedBy: user.uid,
    };

    const overlapping = findOverlappingObjects(tempRect, objects);

    // Firebase-first: Create in Firebase only - real-time listener will update all clients
    try {
      await addObject(newRectangle);
      
      // Show notification if overlaps detected
      if (overlapping.length > 0 && onNotification) {
        onNotification(
          'Shape overlaps with existing object and has been brought to front',
          'info'
        );
      }
    } catch (error) {
      console.error('Failed to create rectangle in Firebase:', error);
      if (onNotification) {
        onNotification('Failed to create rectangle', 'error');
      }
    }
  }, [viewport, width, height, objects, onNotification, user, addObject]);

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
      
      {/* Sync status indicator */}
      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isConnected ? '🟢 Synced' : '🔴 Offline'}
      </div>
    </div>
  );
};
