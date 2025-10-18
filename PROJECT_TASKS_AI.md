## PROJECT_TASKS_AI (Phase 6 - AI Agent)

Status legend: [x] complete, [ ] pending/partial (see notes)

Aligned with PRD_AI.md and decisions provided. Priority: Start with Section 11 (Canvas prerequisites), then proceed in order.

### P0 – Prerequisites: Canvas Feature Additions (Section 11.1)
- Circles
  - Add `Circle` to `CanvasObject` types; extend serialization/deserialization and Firestore sync
  - Implement `createCircle(x, y, radius, fill)` with bounds validation (0–5000)
  - Render circles in Fabric; support move/select/delete; add tests
- Text
  - Add `Text` to `CanvasObject` types; extend serialization/deserialization and Firestore sync
  - Implement `createText(text, x, y, fontSize, fill)` with bounds validation
  - Render text in Fabric; support move/select/delete; add tests
- Resize
  - Programmatic: `resizeObject(rectangle)`, `resizeCircle(circle)`, `resizeText(text)` with validation (positive sizes, min/max)
  - Ensure user-driven resize handles exist (if not, add) and sync updates to Firestore
  - Add unit tests for validation and sync
- Rotate
  - Programmatic: `rotateObject(objectId, degrees)` with normalization (0–360)
  - Add user rotation handles in Fabric; sync rotation to Firestore
  - Add unit tests for normalization and sync
- Delete
  - Ensure unified `deleteObject(objectId)` updates Fabric, Redux, and Firestore
  - Tests for deletion across all object types and edge cases
- Arrangement (agent-targeted building block)
  - Implement: `arrangeHorizontal`, `arrangeVertical`, `arrangeGrid`, `distributeEvenly`
  - These operate on a provided list of objectIds; compute positions using object dimensions
  - Batch update positions to Firestore; unit tests for calculations
- Programmatic creation at explicit coordinates
  - Add ability to create any object at specified (x,y) rather than viewport default

### P0 – AI Tool Function Implementation (Section 11.2)
- Wrapper layer with validation + error messages
  - Shape: `aiCreateRectangle`, `aiCreateCircle`, `aiCreateText`
  - Manipulation: `aiMoveObject`, `aiResizeObject`, `aiRotateObject`, `aiDeleteObject`
  - Layout: `aiArrangeHorizontal`, `aiArrangeVertical`, `aiArrangeGrid`, `aiDistributeEvenly`
  - Queries: `aiGetCanvasState`, `aiGetObjectsByDescription`, `aiGetViewportCenter`
  - History: `aiUndoLastCommand`, `aiUndoLastNCommands`, `aiGetCommandHistory`
- Object selection by description (simple rules)
  - Normalize colors using existing color categories (from colorHash) and match on type+color+rough location
  - Accept CSS names/hex/rgb; normalize to canonical category
- Undo scope
  - Revert all changes made by the command, regardless of object origin; persist pre-change snapshots per command
- Unit tests for wrappers (valid/invalid params, error handling)

### P0 – Chat Interface (Section 11.4)
- Right-side chat window in `CanvasPage` (fixed ~360px width; collapsible optional)
- Firestore `chats/main/messages` with message attribution
  - Use displayName; fallback to email if missing
- Typing indicator, auto-scroll, smooth updates

### P0 – Command Queue (Section 11.5)
- Firestore `commandQueue/main/commands`
- Queue UI below chat (or collapsible panel)
- Client-side processor
  - A single client instance processes the queue FIFO (coordinated via Firestore)
  - Status transitions: queued → executing → complete/failed; remove after delay
  - Error surfaced in queue item and chat

### P0 – OpenAI Integration (Section 11.3)
- [x] Use serverless proxy for OpenAI calls
  - [x] Proxy endpoint to protect API key
  - [x] Client calls proxy; low-latency model selected
- [x] Define tool schemas for function calling covering all tool functions
- [ ] AI message handler that can issue tool calls and produce final natural-language response (pending)

### P0 – AI Agent Core Logic (Section 11.6)
- [x] Agent that bridges chat → queue → tool executions → chat responses
- [x] Maintain in-memory context (last 20 messages); no persistence beyond chat history
- [x] Bounds validation: validate and return user-friendly errors (do not clamp silently)
- [x] Arrange targets: only operate on objects created by the same agent command unless overridden explicitly

### P0 – Testing & Acceptance
- Focus: basic create/move/resize + chat + queue first
- Unit tests: wrappers, arrangement math, undo snapshots, selection by description
- Integration: user message → queue → execution → Firestore updates → chat response
- Performance goals are soft (<2s simple; <5s complex); measure and optimize where feasible

### P1 – Additional Capabilities
- Complex commands: login form, nav bar, card layout (structured arrangements centered on viewport)
- Rotate handles polish, UX animations, keyboard affordances
- Error/empty states, retries for transient failures

### P2 – Documentation
- Update README with AI capabilities, tool function signatures, data model collections, proxy usage
- Add test instructions and scenarios from PRD

### Deliverables Checklist
- [x] Circles, Text, Resize, Rotate, Delete, Arrangement implemented and synced
- [x] Tool wrappers with validation + undo snapshots
- [x] Chat UI + Firestore sync in `main`
- [x] Queue UI + client-side processor (replaced Cloud Function)
- [ ] OpenAI proxy + function-calling schemas + message handler (proxy + schemas done; handler pending)
- [ ] Tests: unit + integration for P0 (unit added for wrappers/arrangements; integration pending)
- [x] Documentation updated
