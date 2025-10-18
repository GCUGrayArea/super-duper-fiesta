import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Stage, Layer, Rect, Text, Ellipse, Transformer, Group } from 'react-konva';
import Konva from 'konva';
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
import { selectUsersWithCursors } from '../store/presenceSlice';
import { CANVAS_CONFIG, Rectangle, Circle, TextObject, isRectangle, isCircle } from '../types/canvas';
import { calculateViewportCenter, findOverlappingObjects, createRectangle, createCircle, createText } from '../utils/canvasObjects';
import { arrangeHorizontal, arrangeVertical, arrangeGrid, distributeEvenly } from '../utils/arrangement';
import { useCanvasSync } from '../hooks/useCanvasSync';

interface CanvasProps {
  width?: number;
  height?: number;
  onNotification?: (message: string, type?: 'info' | 'warning' | 'error' | 'success') => void;
  onMouseMove?: (event: MouseEvent) => void; // Phase 5: Cursor tracking
  onMouseLeave?: () => void; // Phase 5: Cursor tracking
  onUserActivity?: () => Promise<void>; // Phase 5: Activity tracking
}

export const Canvas: React.FC<CanvasProps> = ({
  width = CANVAS_CONFIG.VIEWPORT_WIDTH,
  height = CANVAS_CONFIG.VIEWPORT_HEIGHT,
  onNotification,
  onMouseMove,
  onMouseLeave,
  onUserActivity,
}) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const shapesLayerRef = useRef<Konva.Layer | null>(null);
  const cursorsLayerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const isInternalSelectionRef = useRef(false);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [textEdit, setTextEdit] = useState<{ id: string; value: string; x: number; y: number; width: number } | null>(null);
  // createOpen state moved to CanvasPage toolbar; keep no local state here
  const [isMarquee, setIsMarquee] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const objects = useAppSelector(selectCanvasObjects);
  const viewport = useAppSelector(selectViewport);
  const selection = useAppSelector(selectSelection);
  const usersWithCursors = useAppSelector(selectUsersWithCursors);

  // Phase 4: Canvas sync integration
  const { isConnected, syncObject, addObject, deleteObject: _deleteFromCanvas, batchUpdateObjects } = useCanvasSync({
    canvasId: 'main', // Use main canvas for MVP
    user: user!,
    enabled: !!user
  });

  // View transforms: convert world <-> stage coordinates
  const computeStageTransform = useCallback((v: typeof viewport) => {
    const scale = v.zoom;
    const stageX = -(v.x * scale) + width / 2;
    const stageY = -(v.y * scale) + height / 2;
    return { scale, stageX, stageY };
  }, [width, height]);

  const { scale, stageX, stageY } = useMemo(() => computeStageTransform(viewport), [viewport, computeStageTransform]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = { x: clientX - stage.x(), y: clientY - stage.y() };
    return { x: pointer.x / scale, y: pointer.y / scale };
  }, [scale]);

  // Update stage transforms when viewport changes
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scale({ x: scale, y: scale });
    stage.position({ x: stageX, y: stageY });
    stage.batchDraw();
  }, [scale, stageX, stageY]);

  // (Konva renderer) no fabric conversion needed

  // Keep Redux single selection roughly in sync with local multi-select
  useEffect(() => {
    if (isInternalSelectionRef.current) return;
    const primaryId = selectedIds[0] || null;
    dispatch(selectObject(primaryId));
  }, [selectedIds, dispatch]);

  // Update Transformer nodes based on selection
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes: Konva.Node[] = [];
    selectedIds.forEach(id => {
      const node = nodeRefs.current.get(id);
      if (node) nodes.push(node);
    });
    transformer.nodes(nodes);
    const canRotate = nodes.length === 1 && [
      'rectangle',
      'text'
    ].includes((nodes[0]?.getAttr('objectType') as string));
    transformer.rotateEnabled(canRotate);
    transformer.enabledAnchors([
      'top-left','top-center','top-right',
      'middle-left','middle-right',
      'bottom-left','bottom-center','bottom-right'
    ]);
    transformer.update();
    shapesLayerRef.current?.batchDraw();
  }, [selectedIds]);

  // Selection helpers
  const setSelection = useCallback((ids: string[]) => {
    isInternalSelectionRef.current = true;
    setSelectedIds(ids);
    setTimeout(() => { isInternalSelectionRef.current = false; }, 0);
  }, []);

  // Click on empty stage to clear selection (alt starts marquee)
  const handleStageMouseDown = useCallback((evt: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    if (evt.evt.altKey) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const world = screenToWorld(pointer.x, pointer.y);
      setIsMarquee(true);
      setMarqueeStart(world);
      setMarqueeEnd(world);
      return;
    }
    if (evt.evt.shiftKey) return;
    const clickedOnEmpty = evt.target === stageRef.current;
    if (clickedOnEmpty) {
      setSelection([]);
      // Begin panning
      isPanningRef.current = true;
      lastPanPointRef.current = { x: evt.evt.clientX, y: evt.evt.clientY };
      const container = stageRef.current?.container();
      if (container) container.style.cursor = 'grabbing';
    }
  }, [setSelection, screenToWorld]);

  // Click on shape to select (supports shift-add/remove)
  const handleShapeMouseDown = useCallback((id: string, evt: Konva.KonvaEventObject<MouseEvent>) => {
    const isShift = evt.evt.shiftKey;
    setSelectedIds(prev => {
      if (isShift) {
        return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      }
      return [id];
    });
    if (user) {
      dispatch(bringToFront({ objectId: id, userId: user.uid }));
    }
  }, [dispatch, user]);


  // No-op during drag (we sync on end)
  const handleObjectMoving = useCallback(() => {}, []);

  // Handle drag end to sync object position
  const handleDragEnd = useCallback(async (id: string, node: Konva.Node) => {
    if (!user) return;
    const pos = node.position();
    const nodeWidth = (node as any).width?.() ?? 0;
    const nodeHeight = (node as any).height?.() ?? 0;
    // Convert center-based node position back to our top-left model coordinates
    const updates = { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 } as { x: number; y: number };
    dispatch(updateObject({ id, updates, userId: user.uid }));
    if (onUserActivity) {
      try { await onUserActivity(); } catch {}
    }
    try {
      await syncObject(id, updates);
    } catch (error) {
      console.error('Failed to sync object position:', error);
    }
  }, [dispatch, user, syncObject, onUserActivity]);

  // Handle transform end (resize/rotate)
  const handleTransformEnd = useCallback(async () => {
    if (!user) return;
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = transformer.nodes();
    for (const node of nodes) {
      const id = node.getAttr('objectId') as string;
      const objectType = node.getAttr('objectType') as string;
      const scaleX = (node as any).scaleX?.() ?? 1;
      const scaleY = (node as any).scaleY?.() ?? 1;
      const width = (node as any).width?.() ?? 0;
      const height = (node as any).height?.() ?? 0;
      const finalWidth = Math.max(1, width * scaleX);
      const finalHeight = Math.max(1, height * scaleY);
      const rotation = (node as any).rotation?.() ?? 0;
      const pos = node.position();

      // Convert center-based node position back to top-left model coordinates
      const topLeftX = pos.x - finalWidth / 2;
      const topLeftY = pos.y - finalHeight / 2;
      const updates: any = { x: topLeftX, y: topLeftY };
      if (objectType === 'rectangle') {
        updates.width = finalWidth;
        updates.height = finalHeight;
        updates.rotation = rotation;
      } else if (objectType === 'circle') {
        updates.width = finalWidth;
        updates.height = finalHeight;
      } else if (objectType === 'text') {
        updates.width = finalWidth;
        updates.height = finalHeight;
        updates.rotation = rotation;
      }

      (node as any).scaleX(1);
      (node as any).scaleY(1);

      dispatch(updateObject({ id, updates, userId: user.uid }));
      try {
        await syncObject(id, updates);
      } catch (error) {
        console.error('Failed to sync object modification:', error);
      }
    }
  }, [dispatch, user, syncObject]);

  // Begin in-place text edit
  const beginTextEdit = useCallback((t: TextObject) => {
    // Compute screen coordinates from world using current stage transform
    const left = t.x * scale + stageX;
    const top = t.y * scale + stageY;
    setTextEdit({ id: t.id, value: t.text, x: left, y: top, width: t.width * scale });
  }, [scale, stageX, stageY]);

  const commitTextEdit = useCallback(async () => {
    if (!user || !textEdit) return;
    const { id, value } = textEdit;
    const updates: any = { text: value };
    dispatch(updateObject({ id, updates, userId: user.uid }));
    try { await syncObject(id, updates); } catch (e) { console.error('Failed to sync text edit:', e); }
    setTextEdit(null);
  }, [dispatch, syncObject, textEdit, user]);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback((evt: Konva.KonvaEventObject<WheelEvent>) => {
    evt.evt.preventDefault();
    const delta = evt.evt.deltaY > 0 ? -1 : 1; // natural scroll
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const world = screenToWorld(pointer.x, pointer.y);
    dispatch(zoomViewport({ delta, centerX: world.x, centerY: world.y }));
  }, [dispatch, screenToWorld]);

  // Panning: start inside mouse down handler; no separate handler necessary

  // Mouse move: cursor tracking + marquee + panning
  const handleStageMouseMove = useCallback((evt: Konva.KonvaEventObject<MouseEvent>) => {
    if (onMouseMove) onMouseMove(evt.evt);
    const stage = stageRef.current;
    if (!stage) return;
    if (isMarquee && marqueeStart) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const world = screenToWorld(pointer.x, pointer.y);
      setMarqueeEnd(world);
      const minX = Math.min(marqueeStart.x, world.x);
      const maxX = Math.max(marqueeStart.x, world.x);
      const minY = Math.min(marqueeStart.y, world.y);
      const maxY = Math.max(marqueeStart.y, world.y);
      const hits = objects
        .filter(o => (o as any).width !== undefined && (o as any).height !== undefined)
        .filter(o => !(o.x + (o as any).width < minX || o.x > maxX || o.y + (o as any).height < minY || o.y > maxY))
        .map(o => o.id);
      setSelectedIds(hits);
      return;
    }
    if (!isPanningRef.current || !lastPanPointRef.current) return;
    const deltaX = (lastPanPointRef.current.x - evt.evt.clientX) / viewport.zoom;
    const deltaY = (lastPanPointRef.current.y - evt.evt.clientY) / viewport.zoom;
    dispatch(panViewport({ deltaX, deltaY }));
    lastPanPointRef.current = { x: evt.evt.clientX, y: evt.evt.clientY };
  }, [dispatch, viewport.zoom, onMouseMove, isMarquee, marqueeStart, objects, screenToWorld]);

  // End panning or finish marquee
  const handleStagePanEnd = useCallback(() => {
    if (isMarquee) {
      setIsMarquee(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
    isPanningRef.current = false;
    lastPanPointRef.current = null;
    const container = stageRef.current?.container();
    if (container) container.style.cursor = 'default';
  }, [isMarquee]);

  // Mouse leave for cursor tracking
  const handleStageMouseLeave = useCallback(() => {
    if (onMouseLeave) onMouseLeave();
  }, [onMouseLeave]);

  // No imperative event wiring needed with Konva; handlers are attached inline

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
      
      // Phase 5: Track user activity on object creation
      if (onUserActivity) {
        try {
          await onUserActivity();
        } catch (error) {
          console.error('Failed to update user activity:', error);
        }
      }
      
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
  }, [viewport, width, height, objects, onNotification, user, addObject, onUserActivity]);

  // Expose add rectangle function
  useEffect(() => {
    (window as any).canvasAddRectangle = handleAddRectangle;
    return () => {
      delete (window as any).canvasAddRectangle;
    };
  }, [handleAddRectangle]);

  // Add circle function
  const handleAddCircle = useCallback(async () => {
    if (!user) return;

    const center = calculateViewportCenter(viewport, width, height);
    const diameter = CANVAS_CONFIG.DEFAULT_CIRCLE_DIAMETER;
    const circX = center.x - diameter / 2;
    const circY = center.y - diameter / 2;

    try {
      const newCircle = createCircle(circX, circY, user.uid, objects);
      await addObject(newCircle);

      if (onUserActivity) {
        try {
          await onUserActivity();
        } catch (error) {
          console.error('Failed to update user activity:', error);
        }
      }
    } catch (error) {
      console.error('Failed to create circle in Firebase:', error);
      if (onNotification) {
        onNotification('Failed to create circle', 'error');
      }
    }
  }, [viewport, width, height, objects, onNotification, user, addObject, onUserActivity]);

  // Add text function
  const handleAddText = useCallback(async () => {
    if (!user) return;

    const center = calculateViewportCenter(viewport, width, height);
    const defaultText = 'Text';
    const textX = center.x; // Place with top-left at center for simplicity
    const textY = center.y;

    try {
      const newText = createText(defaultText, textX, textY, user.uid, objects);
      await addObject(newText);

      if (onUserActivity) {
        try {
          await onUserActivity();
        } catch (error) {
          console.error('Failed to update user activity:', error);
        }
      }
    } catch (error) {
      console.error('Failed to create text in Firebase:', error);
      if (onNotification) {
        onNotification('Failed to create text', 'error');
      }
    }
  }, [viewport, width, height, objects, onNotification, user, addObject, onUserActivity]);

  // Expose add circle/text functions
  useEffect(() => {
    (window as any).canvasAddCircle = handleAddCircle;
    (window as any).canvasAddText = handleAddText;
    return () => {
      delete (window as any).canvasAddCircle;
      delete (window as any).canvasAddText;
    };
  }, [handleAddCircle, handleAddText]);

  // Delete selected object(s) via single Firestore write (batch)
  const handleDeleteSelected = useCallback(async () => {
    if (!user) return;
    const idsToDelete = selectedIds.length > 0
      ? selectedIds
      : (selection.selectedObjectId ? [selection.selectedObjectId] : []);
    if (idsToDelete.length === 0) {
      if (onNotification) {
        onNotification('No object selected to delete', 'warning');
      }
      return;
    }
    try {
      const remaining = objects.filter(o => !idsToDelete.includes(o.id));
      await batchUpdateObjects(remaining);
      if (onUserActivity) {
        try { await onUserActivity(); } catch (error) { console.error('Failed to update user activity:', error); }
      }
      // Clear selection after deletion
      setSelectedIds([]);
      dispatch(selectObject(null));
    } catch (error) {
      console.error('Failed to delete object(s):', error);
      if (onNotification) {
        onNotification('Failed to delete object(s)', 'error');
      }
    }
  }, [user, selectedIds, selection.selectedObjectId, objects, batchUpdateObjects, onUserActivity, onNotification, dispatch]);

  // Expose delete function
  useEffect(() => {
    (window as any).canvasDeleteSelected = handleDeleteSelected;
    return () => {
      delete (window as any).canvasDeleteSelected;
    };
  }, [handleDeleteSelected]);

  // Keyboard: Delete or Backspace to delete selected object
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement | null;
        const isInput = !!target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable === true
        );
        if (isInput) return; // Do not intercept typing in inputs/editors

        e.preventDefault();
        (async () => {
          try {
            await handleDeleteSelected();
          } catch (err) {
            // noop
          }
        })();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected]);

  // Helpers to get selected object IDs (Konva multi-selection)
  const getSelectedObjectIds = useCallback((): string[] => {
    if (selectedIds.length > 0) return selectedIds;
    if (selection.selectedObjectId) return [selection.selectedObjectId];
    return [];
  }, [selectedIds, selection.selectedObjectId]);

  // Arrangement actions using batch update
  const handleArrangeHorizontal = useCallback(async () => {
    const ids = getSelectedObjectIds();
    if (ids.length === 0) return;
    const updated = arrangeHorizontal(objects, ids, 16);
    await batchUpdateObjects(updated);
  }, [objects, getSelectedObjectIds, batchUpdateObjects]);

  const handleArrangeVertical = useCallback(async () => {
    const ids = getSelectedObjectIds();
    if (ids.length === 0) return;
    const updated = arrangeVertical(objects, ids, 16);
    await batchUpdateObjects(updated);
  }, [objects, getSelectedObjectIds, batchUpdateObjects]);

  const handleArrangeGrid = useCallback(async () => {
    const ids = getSelectedObjectIds();
    if (ids.length === 0) return;
    const updated = arrangeGrid(objects, ids, { spacing: 16, viewportWidth: width });
    await batchUpdateObjects(updated);
  }, [objects, getSelectedObjectIds, batchUpdateObjects, width]);

  const handleDistributeHorizontal = useCallback(async () => {
    const ids = getSelectedObjectIds();
    if (ids.length < 3) return; // need at least 3 to distribute
    const updated = distributeEvenly(objects, ids, 'horizontal');
    await batchUpdateObjects(updated);
  }, [objects, getSelectedObjectIds, batchUpdateObjects]);

  const handleDistributeVertical = useCallback(async () => {
    const ids = getSelectedObjectIds();
    if (ids.length < 3) return;
    const updated = distributeEvenly(objects, ids, 'vertical');
    await batchUpdateObjects(updated);
  }, [objects, getSelectedObjectIds, batchUpdateObjects]);

  // Expose arrangement functions for toolbar
  useEffect(() => {
    (window as any).canvasArrangeHorizontal = handleArrangeHorizontal;
    (window as any).canvasArrangeVertical = handleArrangeVertical;
    (window as any).canvasArrangeGrid = handleArrangeGrid;
    (window as any).canvasDistributeHorizontal = handleDistributeHorizontal;
    (window as any).canvasDistributeVertical = handleDistributeVertical;
    return () => {
      delete (window as any).canvasArrangeHorizontal;
      delete (window as any).canvasArrangeVertical;
      delete (window as any).canvasArrangeGrid;
      delete (window as any).canvasDistributeHorizontal;
      delete (window as any).canvasDistributeVertical;
    };
  }, [handleArrangeHorizontal, handleArrangeVertical, handleArrangeGrid, handleDistributeHorizontal, handleDistributeVertical]);

  // Render cursors layer nodes
  const otherUsers = useMemo(() => usersWithCursors.filter(u => u.x >= 0 && u.y >= 0), [usersWithCursors]);

  // Sorted objects for drawing order
  const sortedObjects = useMemo(() => [...objects].sort((a, b) => a.zIndex - b.zIndex), [objects]);

  return (
    <div className="relative overflow-hidden border border-gray-300 rounded-lg">
      <Stage
        ref={node => { stageRef.current = node as any; }}
        width={width}
        height={height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStagePanEnd}
        onWheel={handleWheel}
        onMouseLeave={handleStageMouseLeave}
        className="cursor-default"
      >
        <Layer ref={node => { shapesLayerRef.current = node as any; }} listening>
          {/* Shapes */}
          {sortedObjects.map(obj => {
            const key = obj.id;
            const commonProps = {
              x: obj.x,
              y: obj.y,
              draggable: true,
              stroke: (obj as any).stroke,
              strokeWidth: (obj as any).strokeWidth,
              opacity: (obj as any).opacity ?? 1,
              onDragMove: () => handleObjectMoving(),
              onDragEnd: (e: any) => handleDragEnd(obj.id, e.target),
              onMouseDown: (e: any) => handleShapeMouseDown(obj.id, e),
              ref: (node: any) => {
                if (node) {
                  node.setAttr('objectId', obj.id);
                  node.setAttr('objectType', obj.type);
                  nodeRefs.current.set(obj.id, node);
                } else {
                  nodeRefs.current.delete(obj.id);
                }
              }
            } as any;

            if (isRectangle(obj)) {
              return (
                <Rect
                  key={key}
                  {...commonProps}
                  x={obj.x + obj.width / 2}
                  y={obj.y + obj.height / 2}
                  width={obj.width}
                  height={obj.height}
                  offsetX={obj.width / 2}
                  offsetY={obj.height / 2}
                  fill={obj.fill}
                  rotation={(obj as Rectangle).rotation}
                  shadowBlur={0}
                  cornerRadius={0}
                  perfectDrawEnabled={false}
                />
              );
            }
            if (isCircle(obj)) {
              return (
                <Ellipse
                  key={key}
                  {...commonProps}
                  x={obj.x + (obj as Circle).width / 2}
                  y={obj.y + (obj as Circle).height / 2}
                  width={(obj as Circle).width}
                  height={(obj as Circle).height}
                  radiusX={(obj as Circle).width / 2}
                  radiusY={(obj as Circle).height / 2}
                  offsetX={(obj as Circle).width / 2}
                  offsetY={(obj as Circle).height / 2}
                  fill={(obj as Circle).fill}
                  rotation={0}
                  listening
                />
              );
            }
            // Text
            const t = obj as TextObject;
            return (
              <Text
                key={key}
                {...commonProps}
                x={t.x + t.width / 2}
                y={t.y + t.height / 2}
                width={t.width}
                height={t.height}
                offsetX={t.width / 2}
                offsetY={t.height / 2}
                text={t.text}
                fontSize={t.fontSize}
                fill={t.fill}
                rotation={t.rotation}
                onDblClick={() => beginTextEdit(t)}
                listening
              />
            );
          })}

          {/* Transformer for selection */}
          <Transformer
            ref={node => { transformerRef.current = node as any; }}
            rotateEnabled
            ignoreStroke={false}
            boundBoxFunc={(oldBox, newBox) => {
              // prevent negative sizes
              if (newBox.width < 1 || newBox.height < 1) {
                return oldBox;
              }
              return newBox;
            }}
            onTransformEnd={handleTransformEnd}
          />
          {isMarquee && marqueeStart && marqueeEnd && (
            <Rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="rgba(59,130,246,0.1)"
              stroke="#3b82f6"
              strokeWidth={1 / Math.max(scale, 0.0001)}
              dash={[4 / Math.max(scale, 0.0001), 4 / Math.max(scale, 0.0001)]}
              listening={false}
            />
          )}
        </Layer>

        {/* Cursors overlay - not interactive */}
        <Layer ref={node => { cursorsLayerRef.current = node as any; }} listening={false}>
          {otherUsers.map(u => (
            <Group key={u.uid} x={u.x} y={u.y} listening={false}>
              <Ellipse radiusX={8} radiusY={8} fill={u.color} stroke="#ffffff" strokeWidth={2} listening={false} />
              <Text text={u.displayName} x={-30} y={12} fontSize={10} fill="#000000" listening={false} />
            </Group>
          ))}
        </Layer>
      </Stage>

      {/* Toolbars are rendered in CanvasPage outside the canvas */}

      {/* In-place text editor overlay */}
      {textEdit && (
        <div
          className="absolute z-50"
          style={{ left: textEdit.x, top: textEdit.y, width: textEdit.width }}
        >
          <input
            autoFocus
            value={textEdit.value}
            onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })}
            onBlur={commitTextEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTextEdit();
              if (e.key === 'Escape') setTextEdit(null);
            }}
            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded shadow-sm"
          />
        </div>
      )}

      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded z-[60]">
        Viewport: {Math.round(viewport.x)}, {Math.round(viewport.y)} | Zoom: {Math.round(viewport.zoom * 100)}%
      </div>
      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium z-[60] ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isConnected ? '🟢 Synced' : '🔴 Offline'}
      </div>
    </div>
  );
};
