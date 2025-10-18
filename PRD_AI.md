# **Collab Canvas – AI Agent PRD (Phase 6)**

## **1. Overview**

**Goal:**
Extend the Collab Canvas MVP with an AI agent that can manipulate the shared canvas through natural language commands. The agent uses OpenAI's API with function calling to create, modify, and arrange objects on the canvas in response to user chat inputs.

The AI agent is a **shared resource** for all users on the canvas. It maintains conversational context, executes commands in the order received, and provides a natural chat interface for both canvas manipulation and general conversation.

---

## **2. User Stories**

### **Primary User Type: Designer / Collaborator**

* **As a user**, I want to chat with an AI agent so I can create and manipulate canvas objects using natural language.
* **As a user**, I want to type "Create a red rectangle at the center" and see a red rectangle appear on the canvas for all users.
* **As a user**, I want to ask "What objects are currently on the canvas?" and receive a list of existing objects.
* **As a user**, I want to give complex commands like "Create a login form" and see a structured arrangement of objects appear.
* **As a user**, I want to see a queue of pending AI commands so I know when my request will be processed.
* **As a user**, I want the AI to ask for clarification when it doesn't understand my command.
* **As a user**, I want to tell the AI "undo the last three changes you made" and have those changes rolled back.
* **As a user**, I want to select objects by description (e.g., "move the blue circle on the left") without knowing their IDs.
* **As a user**, I want to have a conversation with the AI that isn't just about commands (e.g., "How should I arrange these elements?").

### **Secondary User Type: Team Member**

* **As a team member**, I want to see when other users are interacting with the AI agent.
* **As a team member**, I want AI-generated objects to sync in real-time just like manually created objects.
* **As a team member**, I want to manually edit AI-generated objects without any restrictions.

---

## **3. Key Features (Phase 6 Scope)**

### **3.1 AI Chat Interface**

* **Chat window component:**
  * Fixed position on the **right side** of the screen.
  * Displays conversation history between users and the AI agent.
  * Scrollable message area with user messages on the right, AI responses on the left.
  * Input field at the bottom for typing messages.
  * Send button (or Enter key) to submit messages.

* **Chat functionality:**
  * All users see the same shared chat history (persisted in Firestore).
  * Messages timestamped and attributed to users.
  * AI responses appear in the chat after command execution.
  * Chat history persists across page refreshes.

* **Visual design:**
  * Clear distinction between user messages and AI messages (colors, alignment).
  * Typing indicator when AI is processing a command.
  * Smooth auto-scroll to latest message.

### **3.2 AI Command Queue**

* **Queue display component:**
  * Shows current queue of pending AI commands.
  * Positioned below the chat input (or as a collapsible panel).
  * Commands displayed from **bottom (oldest) to top (newest)**.
  * Each queue item shows: user who requested it, command summary, timestamp.

* **Queue behavior:**
  * Commands processed **first-come, first-served**.
  * Currently executing command highlighted.
  * Completed commands removed from queue.
  * Failed commands marked with error indicator.

* **Visual feedback:**
  * Queue updates in real-time for all users.
  * Clear indication of command progress (queued → executing → complete).

### **3.3 AI Agent Core Logic**

* **Message processing pipeline:**
  1. Receive user message from chat input.
  2. Check if message contains at least one canvas command.
  3. If commands detected, add to command queue.
  4. Process commands in order (call appropriate tool functions).
  5. Generate conversational response (acknowledge commands + respond to chat content).
  6. Send response back to chat.

* **Conversational context:**
  * AI maintains memory of previous messages in the session.
  * Can reference prior commands (e.g., "make it bigger" after creating a shape).
  * Context stored in client-side state (does not persist across page refreshes for MVP).

* **Command detection:**
  * AI determines if user input contains actionable canvas commands.
  * Can handle multiple commands in a single message (e.g., "Create a red circle and move it to the top").
  * Non-command messages receive conversational responses (e.g., "How should I design this?").

### **3.4 AI Tool Functions (Canvas Manipulation)**

The AI agent has access to the following tool functions for canvas manipulation:

#### **3.4.1 Shape Creation**
```typescript
createRectangle(x: number, y: number, width: number, height: number, fill: string): string
// Returns: objectId of created rectangle
// Creates a rectangle at specified position with given dimensions and color

createCircle(x: number, y: number, radius: number, fill: string): string
// Returns: objectId of created circle
// Creates a circle at specified position with given radius and color

createText(text: string, x: number, y: number, fontSize: number, fill: string): string
// Returns: objectId of created text object
// Creates a text layer at specified position with given content, size, and color
```

#### **3.4.2 Object Manipulation**
```typescript
moveObject(objectId: string, x: number, y: number): boolean
// Returns: success status
// Moves object to specified position

resizeObject(objectId: string, width: number, height: number): boolean
// Returns: success status
// Resizes object to specified dimensions (applies to rectangles and text)
// For circles, use resizeCircle(objectId: string, radius: number)

rotateObject(objectId: string, degrees: number): boolean
// Returns: success status
// Rotates object by specified degrees (0-360)

deleteObject(objectId: string): boolean
// Returns: success status
// Removes object from canvas
```

#### **3.4.3 Layout & Arrangement**
```typescript
arrangeHorizontal(objectIds: string[], spacing: number): boolean
// Returns: success status
// Arranges objects in a horizontal row with specified spacing

arrangeVertical(objectIds: string[], spacing: number): boolean
// Returns: success status
// Arranges objects in a vertical column with specified spacing

arrangeGrid(objectIds: string[], rows: number, cols: number, spacingX: number, spacingY: number): boolean
// Returns: success status
// Arranges objects in a grid with specified dimensions and spacing

distributeEvenly(objectIds: string[], axis: 'horizontal' | 'vertical'): boolean
// Returns: success status
// Distributes objects evenly along specified axis
```

#### **3.4.4 Canvas State Queries**
```typescript
getCanvasState(): CanvasObject[]
// Returns: array of all objects currently on canvas
// Each object includes: id, type, position (x, y), dimensions, color, rotation, zIndex

getObjectsByDescription(description: string): string[]
// Returns: array of objectIds matching description
// Examples: "red circles", "text on the left side", "the largest rectangle"
// Uses AI to interpret natural language descriptions and match objects

getViewportCenter(): { x: number, y: number }
// Returns: current viewport center coordinates
// Used for positioning objects relative to user's current view
```

#### **3.4.5 Command History & Undo**
```typescript
undoLastCommand(): boolean
// Returns: success status
// Reverts the last AI command executed

undoLastNCommands(n: number): boolean
// Returns: success status
// Reverts the last N AI commands executed

getCommandHistory(): AICommand[]
// Returns: list of AI commands executed in current session
// Each command includes: timestamp, user, commandType, parameters, objectsCreated
```

### **3.5 Complex Command Handling**

* **Structured arrangements:**
  * AI can interpret high-level commands like "Create a login form" or "Make a navigation bar."
  * AI breaks down complex commands into multiple tool function calls.
  * Default styling applied (colors, spacing, sizes) using predefined palette.
  * Structured arrangements centered on **current viewport center**.

* **Multi-step planning:**
  * AI generates execution plan for complex commands before executing.
  * Plan includes sequence of tool calls and their parameters.
  * Plan logged to console (development) or Firestore (production) for debugging.

* **Semantic grouping (out of scope for Phase 6):**
  * Future enhancement: group related objects (e.g., all form elements) for easier manipulation.

### **3.6 Error Handling & Clarification**

* **Ambiguous commands:**
  * AI asks for clarification when command is unclear.
  * Example: "Make it bigger" with no prior context → "Which object would you like to make bigger?"

* **Invalid operations:**
  * AI validates tool parameters before execution.
  * Example: createRectangle with negative dimensions → error message to user.

* **Tool failures:**
  * If a tool function fails (e.g., objectId not found), AI reports failure in chat.
  * Error message includes explanation and suggests alternatives.
  * Failed commands removed from queue with error indicator.

* **Canvas boundary constraints:**
  * AI never attempts to create objects outside canvas bounds (0-5000 on both axes).
  * If user requests position outside bounds, AI adjusts to nearest valid position and notifies user.

### **3.7 Real-Time Synchronization**

* **AI commands sync to all users:**
  * Objects created/modified by AI sync via existing Firestore infrastructure.
  * All users see AI-generated objects in real-time.
  * AI-generated objects are indistinguishable from manually created objects.

* **Command queue synchronization:**
  * Command queue stored in Firestore and syncs to all users.
  * All users see the same queue state in real-time.
  * Only one AI agent processes commands (coordinated client-side).

* **Chat history synchronization:**
  * Chat messages stored in Firestore and synced to all users.
  * All users see the same chat history.

### **3.8 Command History & Persistence**

* **AI command logging:**
  * Each AI command stored in Firestore collection: `aiCommands/{commandId}`
  * Fields: timestamp, userId, commandType, parameters, objectsCreated[], status, errorMessage
  * Commands indexed by canvas document ID for multi-canvas support.

* **Undo functionality:**
  * `undoLastCommand()` reverts last AI command by deleting created objects or restoring previous state.
  * `undoLastNCommands(n)` reverts last N commands in reverse chronological order.
  * Undo operations logged as separate commands for audit trail.

* **Session context (Phase 6):**
  * Conversational context stored in client-side state (React state or Redux).
  * Context includes last 10-20 messages for AI to reference.
  * Context does **not persist** across page refreshes in Phase 6.

* **Future enhancement (out of scope):**
  * Full context awareness: AI can follow multi-turn commands like "Create a red rectangle" → "Now rotate it 45 degrees."
  * Requires persisting context in Firestore and associating commands with previously created objects.

---

## **4. Canvas Feature Additions (Required for AI Agent)**

To support the AI agent's tool functions, the following canvas features must be implemented:

### **4.1 Circle Shape Support**

* **Circle object type:**
  * Add `Circle` type to `CanvasObject` interface.
  * Properties: id, type: "circle", x, y, radius, fill, stroke, strokeWidth, opacity, zIndex, createdAt, updatedAt.

* **Circle creation:**
  * Implement `createCircle()` function in canvas logic.
  * Add circle rendering to Fabric.js canvas.
  * Sync circle creation to Firestore.

* **Circle manipulation:**
  * Support move, resize (radius adjustment), rotate (no-op for circles), delete.

### **4.2 Text Layer Support**

* **Text object type:**
  * Add `Text` type to `CanvasObject` interface.
  * Properties: id, type: "text", text, x, y, fontSize, fill, fontFamily, rotation, opacity, zIndex, createdAt, updatedAt.

* **Text creation:**
  * Implement `createText()` function in canvas logic.
  * Add text rendering to Fabric.js canvas.
  * Sync text creation to Firestore.

* **Text manipulation:**
  * Support move, resize (font size adjustment), rotate, delete.
  * Text editing (in-place editing) is out of scope for Phase 6.

### **4.3 Object Resizing**

* **Resize functionality:**
  * Implement `resizeObject()` for rectangles (width, height).
  * Implement `resizeCircle()` for circles (radius).
  * Implement `resizeText()` for text (fontSize).

* **Resize interaction:**
  * Manual resize via Fabric.js handles (already implemented in Phase 3).
  * Programmatic resize via AI tool functions.

* **Resize synchronization:**
  * Sync resize operations to Firestore.
  * Update all users' canvases in real-time.

### **4.4 Object Rotation**

* **Rotation functionality:**
  * Implement `rotateObject()` for all object types.
  * Rotation stored in degrees (0-360).

* **Rotation interaction:**
  * Manual rotation via Fabric.js rotation handles (new feature).
  * Programmatic rotation via AI tool functions.

* **Rotation synchronization:**
  * Sync rotation operations to Firestore.
  * Update all users' canvases in real-time.

### **4.5 Object Deletion**

* **Delete functionality:**
  * Implement `deleteObject()` function.
  * Remove object from Fabric.js canvas.
  * Remove object from Redux state.
  * Remove object from Firestore.

* **Delete interaction:**
  * Manual deletion via Delete key or toolbar button (already implemented in Phase 3).
  * Programmatic deletion via AI tool functions.

* **Delete synchronization:**
  * Sync delete operations to Firestore.
  * Update all users' canvases in real-time.

### **4.6 Object Arrangement**

* **Arrangement functions:**
  * Implement `arrangeHorizontal()`, `arrangeVertical()`, `arrangeGrid()`, `distributeEvenly()`.
  * Calculate new positions for objects based on arrangement type.
  * Update object positions in Firestore.

* **Arrangement algorithms:**
  * Horizontal: place objects in a row with specified spacing.
  * Vertical: place objects in a column with specified spacing.
  * Grid: place objects in rows and columns with specified spacing.
  * Distribute: evenly space objects along axis, maintaining order.

* **Arrangement synchronization:**
  * Sync arrangement operations to Firestore (batch update of positions).
  * Update all users' canvases in real-time.

---

## **5. Tech Stack & Integration**

| Layer | Technology | Notes |
|-------|------------|-------|
| **AI Provider** | OpenAI API (GPT-4 with function calling) | Use `openai` npm package |
| **AI Client** | Client-side component (React) | Makes API calls from browser |
| **API Key Management** | Vercel environment variable | `VITE_OPENAI_API_KEY` |
| **Chat Storage** | Firestore collection: `chats/{canvasId}` | Messages synced to all users |
| **Command Queue** | Firestore collection: `commandQueue/{canvasId}` | Queue synced to all users |
| **Command History** | Firestore collection: `aiCommands/{commandId}` | Persistent command log |
| **Context Management** | Client-side state (React state or Redux) | Not persisted in Phase 6 |

### **5.1 OpenAI Function Calling Integration**

* **Function schema definition:**
  * Define all tool functions in OpenAI function calling format.
  * Include parameter types, descriptions, and required fields.
  * Example:
    ```json
    {
      "name": "createRectangle",
      "description": "Creates a rectangle on the canvas",
      "parameters": {
        "type": "object",
        "properties": {
          "x": { "type": "number", "description": "X position" },
          "y": { "type": "number", "description": "Y position" },
          "width": { "type": "number", "description": "Width in pixels" },
          "height": { "type": "number", "description": "Height in pixels" },
          "fill": { "type": "string", "description": "Fill color (CSS color string)" }
        },
        "required": ["x", "y", "width", "height", "fill"]
      }
    }
    ```

* **Function execution:**
  * AI returns function calls in response.
  * Client executes function calls against canvas API.
  * Results sent back to AI for final response generation.

* **Error handling:**
  * If OpenAI API is unavailable, display: "This agent is unavailable, please try again later."
  * Log API errors to console (development) or error tracking service (production).
  * Retry logic for transient failures (optional).

### **5.2 Firestore Data Structures**

#### **Chat Messages**
```typescript
// Collection: chats/{canvasId}/messages/{messageId}
interface ChatMessage {
  id: string;
  canvasId: string;
  userId: string;
  displayName: string;
  message: string;
  isAI: boolean;
  timestamp: number;
  commandIds?: string[]; // References to executed commands
}
```

#### **Command Queue**
```typescript
// Collection: commandQueue/{canvasId}/commands/{commandId}
interface QueuedCommand {
  id: string;
  canvasId: string;
  userId: string;
  displayName: string;
  command: string;
  status: 'queued' | 'executing' | 'complete' | 'failed';
  timestamp: number;
  errorMessage?: string;
}
```

#### **AI Command History**
```typescript
// Collection: aiCommands/{commandId}
interface AICommand {
  id: string;
  canvasId: string;
  userId: string;
  commandType: string; // e.g., "createRectangle", "arrangeHorizontal"
  parameters: Record<string, any>;
  objectsCreated: string[]; // objectIds created by this command
  objectsModified: string[]; // objectIds modified by this command
  objectsDeleted: string[]; // objectIds deleted by this command
  timestamp: number;
  status: 'success' | 'failed';
  errorMessage?: string;
}
```

---

## **6. Out of Scope (Future Enhancements)**

| Category | Description |
|----------|-------------|
| **Full Context Awareness** | AI tracks object references across multi-turn conversations (e.g., "Create a red rectangle" → "Now rotate it 45 degrees"). Requires associating commands with created objects and persisting context in Firestore. |
| **Semantic Grouping** | Group related objects (e.g., all form elements) for easier manipulation. Requires implementing group/ungroup functionality in canvas. |
| **Canvas Export** | Export canvas as SVG image. Nice-to-have but not required for MVP. |
| **Multi-Agent Collaboration** | Multiple AI agents working together on the same canvas. Not considered for this project. |
| **Advanced Object Selection** | AI selects objects by complex descriptions (e.g., "the three largest rectangles in the top-left quadrant"). Phase 6 supports basic description matching only. |
| **Custom Styling** | AI applies custom styles (gradients, shadows, borders) to objects. Phase 6 uses default solid colors only. |
| **Object Editing** | In-place text editing, path editing for custom shapes. Phase 6 supports creation and transformation only. |
| **AI-Assisted Design** | AI suggests improvements, generates design variations, or provides design feedback. Phase 6 focuses on command execution only. |
| **Voice Commands** | Speech-to-text input for AI commands. Phase 6 uses text chat only. |
| **Persistent Context** | Conversation context persists across page refreshes. Phase 6 stores context in client-side state only. |

---

## **7. Testing & Acceptance Criteria**

### **7.1 AI Chat Interface Testing**

* **Test: Chat window renders correctly**
  * Chat window visible on right side of screen.
  * Input field and send button functional.
  * Messages display in correct order.

* **Test: Multi-user chat synchronization**
  * User A sends message → User B sees message in real-time.
  * Messages timestamped and attributed correctly.

* **Test: Chat history persistence**
  * User refreshes page → chat history preserved.
  * New user joins → sees full chat history.

### **7.2 AI Command Queue Testing**

* **Test: Queue displays correctly**
  * Commands appear in queue after user submits.
  * Queue order: bottom (oldest) to top (newest).
  * Currently executing command highlighted.

* **Test: Queue synchronization**
  * User A submits command → User B sees command in queue.
  * Command completion removes from queue for all users.

* **Test: First-come, first-served execution**
  * User A submits command 1, User B submits command 2.
  * Command 1 executes first, then command 2.
  * No command reordering.

### **7.3 Shape Creation Testing**

* **Test: Create rectangle command**
  * Input: "Create a red rectangle at 100, 200 with width 150 and height 100"
  * Expected: Red rectangle appears at specified position and size.
  * All users see rectangle in real-time.

* **Test: Create circle command**
  * Input: "Create a blue circle at 300, 400 with radius 50"
  * Expected: Blue circle appears at specified position and size.
  * All users see circle in real-time.

* **Test: Create text command**
  * Input: "Add text that says 'Hello World' at 500, 600 with font size 24"
  * Expected: Text appears at specified position with correct content and size.
  * All users see text in real-time.

* **Test: Multiple shape creation**
  * Input: "Create three red rectangles in a row"
  * Expected: AI creates three rectangles and arranges them horizontally.
  * All users see all three rectangles.

### **7.4 Object Manipulation Testing**

* **Test: Move object command**
  * Input: "Move the red rectangle to 200, 300"
  * Expected: Red rectangle moves to specified position.
  * All users see updated position.

* **Test: Resize object command**
  * Input: "Resize the blue circle to radius 100"
  * Expected: Circle resizes to specified radius.
  * All users see updated size.

* **Test: Rotate object command**
  * Input: "Rotate the text 45 degrees"
  * Expected: Text rotates 45 degrees.
  * All users see rotated text.

* **Test: Delete object command**
  * Input: "Delete the red rectangle"
  * Expected: Red rectangle removed from canvas.
  * All users see deletion in real-time.

### **7.5 Layout & Arrangement Testing**

* **Test: Horizontal arrangement**
  * Input: "Arrange these three shapes in a horizontal row with 20px spacing"
  * Expected: AI arranges selected shapes horizontally with specified spacing.
  * All users see updated positions.

* **Test: Vertical arrangement**
  * Input: "Arrange these shapes in a vertical column"
  * Expected: AI arranges selected shapes vertically.
  * All users see updated positions.

* **Test: Grid arrangement**
  * Input: "Create a 3x3 grid of circles"
  * Expected: AI creates 9 circles and arranges them in a 3x3 grid.
  * All users see all circles in correct positions.

* **Test: Even distribution**
  * Input: "Distribute these shapes evenly horizontally"
  * Expected: AI calculates even spacing and updates positions.
  * All users see updated positions.

### **7.6 Complex Command Testing**

* **Test: Login form generation**
  * Input: "Create a login form"
  * Expected: AI creates at least 3 elements (username field, password field, submit button) arranged vertically.
  * Elements positioned at viewport center.
  * All users see generated form.

* **Test: Navigation bar generation**
  * Input: "Build a navigation bar with 4 menu items"
  * Expected: AI creates 4 text elements arranged horizontally.
  * All users see navigation bar.

* **Test: Card layout generation**
  * Input: "Make a card layout with title, image placeholder, and description"
  * Expected: AI creates 3 elements (text for title, rectangle for image, text for description) arranged vertically.
  * All users see card layout.

### **7.7 Canvas State Query Testing**

* **Test: Get canvas state**
  * Input: "What objects are currently on the canvas?"
  * Expected: AI lists all objects with their types, positions, and colors.
  * Response includes accurate object count and details.

* **Test: Select by description**
  * Input: "Move the red circle on the left to the center"
  * Expected: AI identifies red circle, calculates viewport center, moves circle.
  * All users see updated position.

* **Test: Complex description matching**
  * Input: "Delete all blue rectangles"
  * Expected: AI identifies all blue rectangles and deletes them.
  * All users see deletions.

### **7.8 Undo Functionality Testing**

* **Test: Undo last command**
  * User creates a rectangle via AI.
  * Input: "Undo the last change you made"
  * Expected: Rectangle deleted, canvas returns to previous state.
  * All users see undo effect.

* **Test: Undo last N commands**
  * User issues 5 AI commands.
  * Input: "Undo the last three changes you made"
  * Expected: Last 3 commands reverted in reverse order.
  * All users see undo effects.

* **Test: Undo with no history**
  * Input: "Undo the last change" with no prior AI commands.
  * Expected: AI responds "No previous commands to undo."
  * No canvas changes.

### **7.9 Error Handling Testing**

* **Test: Ambiguous command**
  * Input: "Make it bigger" with no prior context.
  * Expected: AI asks "Which object would you like to make bigger?"
  * No canvas changes until clarification provided.

* **Test: Invalid parameters**
  * Input: "Create a rectangle with width -100"
  * Expected: AI responds with error message about invalid dimensions.
  * No rectangle created.

* **Test: Object not found**
  * Input: "Move the purple square to the center" (no purple square exists).
  * Expected: AI responds "I couldn't find a purple square on the canvas."
  * No canvas changes.

* **Test: Canvas boundary violation**
  * Input: "Create a rectangle at position 6000, 6000"
  * Expected: AI adjusts position to 5000, 5000 and notifies user.
  * Rectangle created at adjusted position.

* **Test: OpenAI API failure**
  * Simulate API unavailability.
  * Expected: User sees message "This agent is unavailable, please try again later."
  * Chat input disabled or shows error state.

### **7.10 Performance Testing**

* **Test: Response time**
  * Submit 10 single-step commands (e.g., "Create a red circle").
  * Expected: 90%+ of responses complete in <2 seconds.
  * Average response time <2 seconds.

* **Test: Complex command response time**
  * Submit complex command (e.g., "Create a login form").
  * Expected: Response completes in <5 seconds.
  * All elements created and arranged correctly.

* **Test: Multiple concurrent commands**
  * User A submits command 1, User B submits command 2 before command 1 completes.
  * Expected: Commands execute in order without errors.
  * Both commands complete successfully.

* **Test: Scalability with command history**
  * Execute 50+ AI commands.
  * Expected: No performance degradation.
  * Undo functionality remains fast.

### **7.11 Multi-User AI Interaction Testing**

* **Test: Shared AI agent**
  * User A asks AI a question, User B asks AI a different question.
  * Expected: Both users see both questions and responses in chat.
  * AI maintains separate context for each conversation (out of scope for Phase 6, but should not crash).

* **Test: Simultaneous commands**
  * User A and User B submit commands at the same time.
  * Expected: Both commands appear in queue in order received.
  * Both commands execute successfully without conflict.

* **Test: AI-generated objects are editable**
  * AI creates a rectangle.
  * User manually drags rectangle to new position.
  * Expected: Rectangle moves normally, syncs to all users.
  * No special handling for AI-generated objects.

---

## **8. Technical Risks & Challenges**

| Risk | Description | Mitigation |
|------|-------------|------------|
| **OpenAI API latency** | API calls may take 2-5 seconds, causing perceived lag. | Show typing indicator, provide feedback in chat ("Working on it..."). |
| **OpenAI API rate limits** | Free tier has limited requests per minute. | Implement rate limit handling, queue requests, notify user of limits. |
| **Function calling complexity** | Complex commands may require multiple tool calls and context management. | Break down complex commands into explicit steps, log execution plan. |
| **Ambiguous user input** | Natural language is inherently ambiguous. | AI should ask for clarification rather than guessing. Test with ambiguous prompts. |
| **Multi-user command conflicts** | Two users issuing conflicting commands simultaneously. | Queue prevents simultaneous execution. Canvas conflict resolution handles object-level conflicts. |
| **Context persistence** | Conversational context stored client-side may be lost on refresh. | Accept as limitation for Phase 6. Document as future enhancement. |
| **API key security** | OpenAI API key must be protected. | Store in Vercel environment variable, never commit to git. Consider proxy server for production. |
| **Command history size** | Large command histories may slow down Firestore queries. | Implement pagination or archiving for old commands (optional). |

---

## **9. Summary of MVP Deliverable**

**What "Done" Means for Phase 6:**

✅ AI chat interface on right side of screen  
✅ Shared chat history synced to all users  
✅ AI command queue displays pending commands  
✅ AI processes commands first-come, first-served  
✅ AI can create rectangles, circles, and text  
✅ AI can move, resize, rotate, and delete objects  
✅ AI can arrange objects (horizontal, vertical, grid, distribute)  
✅ AI can query canvas state and select by description  
✅ AI can undo last N commands  
✅ AI asks for clarification on ambiguous commands  
✅ AI handles errors gracefully with user-friendly messages  
✅ Complex commands (e.g., "Create a login form") work correctly  
✅ AI-generated objects sync to all users in real-time  
✅ AI responses appear in <2 seconds for simple commands  
✅ OpenAI API integration functional and secure  
✅ Canvas features implemented: circles, text, resize, rotate, delete, arrangement  

---

## **10. Post-Phase 6 Roadmap**

| Phase | Feature | Description | Priority |
|-------|---------|-------------|----------|
| **Phase 7: Context Awareness** | Full conversational context | AI tracks object references across multi-turn conversations. Requires persisting context in Firestore and associating commands with created objects. | High |
| **Phase 7: Advanced Selection** | Complex object selection | AI selects objects by complex descriptions (e.g., "the three largest rectangles in the top-left quadrant"). | Medium |
| **Phase 8: Design Assistance** | AI design feedback | AI suggests improvements, generates design variations, or provides design feedback based on design principles. | High |
| **Phase 8: Canvas Export** | SVG export | Export canvas as SVG image via AI command (e.g., "Export this as SVG"). | Medium |
| **Phase 9: Semantic Grouping** | Object grouping | Group related objects for easier manipulation. AI can create and manipulate groups. | Medium |
| **Phase 9: Custom Styling** | Advanced styling | AI applies gradients, shadows, borders, and other advanced styles. | Low |
| **Phase 10: Voice Commands** | Speech-to-text | Voice input for AI commands using Web Speech API. | Low |
| **Phase 10: AI Collaboration** | Multi-agent systems | Multiple AI agents with specialized roles (e.g., layout agent, color agent) collaborate on canvas. | Low |

---

## **11. Implementation Notes for AI Agents**

### **Development Sequence - CRITICAL**

The phases must be completed in this order:

1. **Canvas Feature Additions (11.1):** Implement circles, text, resize, rotate, delete, arrangement functions.
2. 2. **AI Tool Function Implementation (11.2):** Build canvas API functions that AI will call.
3. **OpenAI Integration (11.3):** Set up OpenAI API client and function calling schema.
4. **Chat Interface (11.4):** Build chat UI and message synchronization.
5. **Command Queue (11.5):** Implement command queue and execution logic.
6. **AI Agent Core Logic (11.6):** Connect all pieces and test end-to-end.
7. **Error Handling & Polish (11.7):** Handle edge cases and improve UX.

### **11.1 Canvas Feature Additions**

**Priority: Complete FIRST before any AI work**

These features are prerequisites for the AI agent to function:

* **Circle Implementation:**
  * Add Circle type to TypeScript interfaces
  * Implement createCircle() in canvas logic
  * Add Fabric.js circle rendering
  * Sync circle creation/updates to Firestore
  * Test circle creation, movement, selection, deletion
  * Write unit tests for circle serialization/deserialization

* **Text Implementation:**
  * Add Text type to TypeScript interfaces
  * Implement createText() in canvas logic
  * Add Fabric.js text rendering
  * Sync text creation/updates to Firestore
  * Test text creation, movement, selection, deletion
  * Write unit tests for text serialization/deserialization

* **Resize Implementation:**
  * Implement resizeObject() for rectangles (width, height)
  * Implement resizeCircle() for circles (radius)
  * Implement resizeText() for text (fontSize)
  * Add Fabric.js resize controls if not present
  * Sync resize operations to Firestore
  * Test manual and programmatic resizing
  * Write unit tests for resize validation (min/max sizes)

* **Rotate Implementation:**
  * Implement rotateObject() for all object types
  * Add Fabric.js rotation controls
  * Sync rotation operations to Firestore
  * Store rotation in degrees (0-360)
  * Test manual and programmatic rotation
  * Write unit tests for rotation angle normalization

* **Delete Implementation:**
  * Verify deleteObject() works for all object types
  * Test deletion via toolbar, keyboard shortcut, and programmatic call
  * Ensure deletion syncs to all users
  * Write unit tests for deletion edge cases

* **Arrangement Implementation:**
  * Implement arrangeHorizontal(objectIds, spacing)
  * Implement arrangeVertical(objectIds, spacing)
  * Implement arrangeGrid(objectIds, rows, cols, spacingX, spacingY)
  * Implement distributeEvenly(objectIds, axis)
  * Calculate new positions based on object dimensions
  * Batch update positions in Firestore
  * Test arrangements with various object counts and types
  * Write unit tests for arrangement calculations

**Testing Checkpoint:**

Before proceeding to AI integration, verify:
* All three shape types (rectangle, circle, text) can be created manually
* All objects can be moved, resized, rotated, and deleted
* Arrangement functions work correctly when called programmatically
* All operations sync to all users in real-time
* Unit tests pass for all new features

### **11.2 AI Tool Function Implementation**

**Build canvas API layer that AI will call:**

* **Create wrapper functions:**
  * Wrap existing canvas functions with consistent return types
  * Add parameter validation (type checking, range checking)
  * Add error handling with descriptive error messages
  * Return success/failure status and object IDs

* **Example implementation pattern:**
  ```typescript
  // AI Tool Function Wrapper
  export function aiCreateRectangle(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    fill: string
  ): { success: boolean; objectId?: string; error?: string } {
    try {
      // Validate parameters
      if (width <= 0 || height <= 0) {
        return { success: false, error: "Width and height must be positive" };
      }
      if (x < 0 || x > 5000 || y < 0 || y > 5000) {
        return { success: false, error: "Position outside canvas bounds" };
      }
      
      // Call existing canvas logic
      const objectId = createRectangle(x, y, width, height, fill);
      
      // Log to AI command history
      logAICommand({
        commandType: 'createRectangle',
        parameters: { x, y, width, height, fill },
        objectsCreated: [objectId]
      });
      
      return { success: true, objectId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  ```

* **Implement all tool functions:**
  * Shape creation: aiCreateRectangle, aiCreateCircle, aiCreateText
  * Manipulation: aiMoveObject, aiResizeObject, aiRotateObject, aiDeleteObject
  * Arrangement: aiArrangeHorizontal, aiArrangeVertical, aiArrangeGrid, aiDistributeEvenly
  * Queries: aiGetCanvasState, aiGetObjectsByDescription, aiGetViewportCenter
  * History: aiUndoLastCommand, aiUndoLastNCommands, aiGetCommandHistory

* **Object selection by description:**
  * Implement aiGetObjectsByDescription() using simple pattern matching initially
  * Example: "red circles" → filter objects where type === "circle" && fill === "red"
  * Example: "text on the left" → filter text objects where x < canvasWidth / 2
  * Can enhance with more sophisticated matching later

* **Write unit tests:**
  * Test each tool function with valid parameters
  * Test with invalid parameters (negative dimensions, out of bounds, etc.)
  * Test error handling and return values
  * Mock Firestore to avoid real database calls in tests

### **11.3 OpenAI Integration**

**Set up OpenAI API client:**

* **Install dependencies:**
  ```bash
  npm install openai
  ```

* **Configure API client:**
  ```typescript
  import OpenAI from 'openai';
  
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // For client-side usage
  });
  ```

* **Define function schemas:**
  * Create JSON schemas for all tool functions
  * Include parameter types, descriptions, and requirements
  * Group related functions (creation, manipulation, queries)
  * Example schema:
    ```typescript
    const toolSchemas = [
      {
        type: "function",
        function: {
          name: "createRectangle",
          description: "Creates a rectangle on the canvas at the specified position",
          parameters: {
            type: "object",
            properties: {
              x: {
                type: "number",
                description: "X coordinate (0-5000)"
              },
              y: {
                type: "number",
                description: "Y coordinate (0-5000)"
              },
              width: {
                type: "number",
                description: "Width in pixels (must be positive)"
              },
              height: {
                type: "number",
                description: "Height in pixels (must be positive)"
              },
              fill: {
                type: "string",
                description: "Fill color (CSS color string, e.g., 'red', '#FF0000', 'rgb(255,0,0)')"
              }
            },
            required: ["x", "y", "width", "height", "fill"]
          }
        }
      },
      // ... additional tool schemas
    ];
    ```

* **Implement AI message handler:**
  ```typescript
  async function sendMessageToAI(
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    try {
      // Build messages array with history
      const messages = [
        {
          role: "system",
          content: "You are a helpful AI assistant that can manipulate a collaborative design canvas. When users ask you to create or modify objects, use the provided tool functions. You can also have general conversations about design and answer questions."
        },
        ...conversationHistory.map(msg => ({
          role: msg.isAI ? "assistant" : "user",
          content: msg.message
        })),
        {
          role: "user",
          content: userMessage
        }
      ];
      
      // Call OpenAI API with function calling
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        tools: toolSchemas,
        tool_choice: "auto"
      });
      
      // Process tool calls if present
      const message = response.choices[0].message;
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const result = await executeToolCall(toolCall);
          // Add tool call result to conversation
        }
      }
      
      return message.content || "Command executed successfully";
    } catch (error) {
      if (error.message.includes('API key')) {
        return "This agent is unavailable, please try again later.";
      }
      throw error;
    }
  }
  ```

* **Implement tool call executor:**
  ```typescript
  async function executeToolCall(toolCall: any): Promise<any> {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    
    // Map function names to actual implementations
    const toolFunctions = {
      createRectangle: aiCreateRectangle,
      createCircle: aiCreateCircle,
      createText: aiCreateText,
      moveObject: aiMoveObject,
      // ... etc
    };
    
    const func = toolFunctions[functionName];
    if (!func) {
      return { success: false, error: `Unknown function: ${functionName}` };
    }
    
    return await func(...Object.values(args));
  }
  ```

* **Error handling:**
  * Catch API errors (rate limits, network failures, invalid API key)
  * Display user-friendly error messages
  * Log errors to console in development
  * Consider retry logic for transient failures

### **11.4 Chat Interface**

**Build chat UI component:**

* **Chat window layout:**
  ```typescript
  // ChatWindow.tsx
  interface ChatWindowProps {
    canvasId: string;
  }
  
  export function ChatWindow({ canvasId }: ChatWindowProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isAITyping, setIsAITyping] = useState(false);
    
    // Subscribe to chat messages from Firestore
    useEffect(() => {
      const unsubscribe = subscribeToChat(canvasId, setMessages);
      return unsubscribe;
    }, [canvasId]);
    
    const handleSendMessage = async () => {
      if (!inputValue.trim()) return;
      
      // Add user message to chat
      await addChatMessage(canvasId, {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        message: inputValue,
        isAI: false,
        timestamp: Date.now()
      });
      
      setInputValue('');
      setIsAITyping(true);
      
      // Send to AI agent
      const aiResponse = await sendMessageToAI(inputValue, messages);
      
      // Add AI response to chat
      await addChatMessage(canvasId, {
        userId: 'ai-agent',
        displayName: 'AI Assistant',
        message: aiResponse,
        isAI: true,
        timestamp: Date.now()
      });
      
      setIsAITyping(false);
    };
    
    return (
      <div className="chat-window">
        <div className="chat-messages">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isAITyping && <TypingIndicator />}
        </div>
        <div className="chat-input">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me to create something..."
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    );
  }
  ```

* **Firestore chat synchronization:**
  ```typescript
  // chatSync.ts
  export function subscribeToChat(
    canvasId: string,
    onUpdate: (messages: ChatMessage[]) => void
  ): () => void {
    const chatRef = collection(db, `chats/${canvasId}/messages`);
    const q = query(chatRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      onUpdate(messages);
    });
  }
  
  export async function addChatMessage(
    canvasId: string,
    message: Omit<ChatMessage, 'id'>
  ): Promise<void> {
    const chatRef = collection(db, `chats/${canvasId}/messages`);
    await addDoc(chatRef, message);
  }
  ```

* **Chat styling:**
  * Fixed position on right side (300-400px width)
  * User messages aligned right (blue background)
  * AI messages aligned left (gray background)
  * Auto-scroll to bottom on new messages
  * Smooth transitions for new messages
  * Typing indicator animation

* **Responsive behavior:**
  * Chat window collapsible on smaller screens (optional)
  * Minimum width constraints
  * Mobile layout considerations (future)

### **11.5 Command Queue**

**Implement command queue system:**

* **Queue UI component:**
  ```typescript
  // CommandQueue.tsx
  export function CommandQueue({ canvasId }: { canvasId: string }) {
    const [queue, setQueue] = useState<QueuedCommand[]>([]);
    
    useEffect(() => {
      const unsubscribe = subscribeToCommandQueue(canvasId, setQueue);
      return unsubscribe;
    }, [canvasId]);
    
    return (
      <div className="command-queue">
        <h3>AI Command Queue</h3>
        {queue.length === 0 ? (
          <p>No pending commands</p>
        ) : (
          <ul>
            {queue.map(cmd => (
              <li
                key={cmd.id}
                className={`queue-item status-${cmd.status}`}
              >
                <span className="user">{cmd.displayName}</span>
                <span className="command">{cmd.command}</span>
                <span className="status">{cmd.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  ```

* **Queue management logic:**
  ```typescript
  // commandQueue.ts
  export async function addToCommandQueue(
    canvasId: string,
    command: Omit<QueuedCommand, 'id' | 'status' | 'timestamp'>
  ): Promise<string> {
    const queueRef = collection(db, `commandQueue/${canvasId}/commands`);
    const docRef = await addDoc(queueRef, {
      ...command,
      status: 'queued',
      timestamp: Date.now()
    });
    return docRef.id;
  }
  
  export async function updateCommandStatus(
    canvasId: string,
    commandId: string,
    status: 'executing' | 'complete' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const commandRef = doc(db, `commandQueue/${canvasId}/commands`, commandId);
    await updateDoc(commandRef, { status, errorMessage });
  }
  
  export async function removeFromQueue(
    canvasId: string,
    commandId: string
  ): Promise<void> {
    const commandRef = doc(db, `commandQueue/${canvasId}/commands`, commandId);
    await deleteDoc(commandRef);
  }
  
  export function subscribeToCommandQueue(
    canvasId: string,
    onUpdate: (queue: QueuedCommand[]) => void
  ): () => void {
    const queueRef = collection(db, `commandQueue/${canvasId}/commands`);
    const q = query(queueRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const queue = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QueuedCommand[];
      onUpdate(queue);
    });
  }
  ```

* **Queue processing logic:**
  ```typescript
  // queueProcessor.ts
  let isProcessing = false;
  
  export async function processCommandQueue(canvasId: string): Promise<void> {
    if (isProcessing) return; // Prevent concurrent processing
    isProcessing = true;
    
    try {
      // Get next queued command
      const queueRef = collection(db, `commandQueue/${canvasId}/commands`);
      const q = query(
        queueRef,
        where('status', '==', 'queued'),
        orderBy('timestamp', 'asc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        isProcessing = false;
        return;
      }
      
      const commandDoc = snapshot.docs[0];
      const command = { id: commandDoc.id, ...commandDoc.data() } as QueuedCommand;
      
      // Update status to executing
      await updateCommandStatus(canvasId, command.id, 'executing');
      
      // Execute command
      try {
        await executeCommand(command);
        await updateCommandStatus(canvasId, command.id, 'complete');
        
        // Remove from queue after short delay
        setTimeout(() => removeFromQueue(canvasId, command.id), 2000);
      } catch (error) {
        await updateCommandStatus(
          canvasId,
          command.id,
          'failed',
          error.message
        );
      }
    } finally {
      isProcessing = false;
      
      // Check for more commands
      setTimeout(() => processCommandQueue(canvasId), 500);
    }
  }
  
  async function executeCommand(command: QueuedCommand): Promise<void> {
    // Parse command and call AI agent
    const response = await sendMessageToAI(command.command, []);
    // AI agent will execute tool calls and update canvas
  }
  ```

* **Queue coordination:**
  * Use Firestore transaction for queue operations to prevent race conditions
  * Only one client processes queue at a time (use distributed lock pattern)

### **11.6 AI Agent Core Logic**

**Connect all components:**

* **Agent initialization:**
  ```typescript
  // aiAgent.ts
  export class AIAgent {
    private canvasId: string;
    private conversationHistory: ChatMessage[] = [];
    
    constructor(canvasId: string) {
      this.canvasId = canvasId;
      this.loadConversationHistory();
    }
    
    private async loadConversationHistory(): Promise<void> {
      // Load last 20 messages for context
      const messages = await getRecentChatMessages(this.canvasId, 20);
      this.conversationHistory = messages;
    }
    
    async processUserMessage(message: string, userId: string): Promise<void> {
      // Add to command queue
      const commandId = await addToCommandQueue(this.canvasId, {
        userId,
        displayName: getUserDisplayName(userId),
        command: message,
        canvasId: this.canvasId
      });
      
      // Start queue processing if not already running
      processCommandQueue(this.canvasId);
    }
    
    async executeCommand(command: string): Promise<string> {
      try {
        // Call OpenAI with function calling
        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            {
              role: "system",
              content: this.getSystemPrompt()
            },
            ...this.conversationHistory.map(msg => ({
              role: msg.isAI ? "assistant" : "user",
              content: msg.message
            })),
            {
              role: "user",
              content: command
            }
          ],
          tools: toolSchemas,
          tool_choice: "auto"
        });
        
        const message = response.choices[0].message;
        
        // Execute tool calls
        if (message.tool_calls) {
          const results = [];
          for (const toolCall of message.tool_calls) {
            const result = await this.executeToolCall(toolCall);
            results.push(result);
          }
          
          // Generate final response with tool results
          const finalResponse = await this.generateResponseWithResults(
            command,
            message.tool_calls,
            results
          );
          return finalResponse;
        }
        
        return message.content || "I understand. How can I help with your canvas?";
      } catch (error) {
        if (error.message.includes('API key')) {
          return "This agent is unavailable, please try again later.";
        }
        throw error;
      }
    }
    
    private getSystemPrompt(): string {
      return `You are a helpful AI assistant for a collaborative design canvas. 
      
Your capabilities:
- Create shapes (rectangles, circles, text) on the canvas
- Move, resize, and rotate existing objects
- Arrange multiple objects in layouts (horizontal, vertical, grid)
- Query the current canvas state
- Undo previous commands

When users ask you to create or modify objects, use the provided tool functions.
Always confirm what you've done in your response.
If a command is ambiguous, ask for clarification.
You can also have general conversations about design.

The canvas is 5000x5000 pixels. Objects must be positioned within these bounds.
`;
    }
    
    private async executeToolCall(toolCall: any): Promise<any> {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      // Log command to history
      await logAICommand(this.canvasId, {
        commandType: functionName,
        parameters: args,
        timestamp: Date.now()
      });
      
      // Execute tool function
      return await executeTool(functionName, args);
    }
    
    private async generateResponseWithResults(
      userCommand: string,
      toolCalls: any[],
      results: any[]
    ): Promise<string> {
      // Call OpenAI again with tool results to generate natural language response
      const toolResults = toolCalls.map((call, i) => ({
        tool_call_id: call.id,
        role: "tool",
        name: call.function.name,
        content: JSON.stringify(results[i])
      }));
      
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          ...this.conversationHistory.map(msg => ({
            role: msg.isAI ? "assistant" : "user",
            content: msg.message
          })),
          {
            role: "user",
            content: userCommand
          },
          {
            role: "assistant",
            content: null,
            tool_calls: toolCalls
          },
          ...toolResults
        ]
      });
      
      return response.choices[0].message.content;
    }
  }
  ```

* **Integration with canvas:**
  * Tool functions directly call existing canvas logic
  * All canvas updates flow through normal Firestore sync
  * AI-generated objects treated identically to manually created objects

* **Context management:**
  * Keep last 20 messages in memory for context
  * Clear context on page refresh (Phase 6 limitation)
  * Future: persist context in Firestore

### **11.7 Error Handling & Polish**

**Handle edge cases:**

* **API failures:**
  * Network errors → retry with exponential backoff
  * Rate limits → show "Too many requests, please wait" message
  * Invalid API key → show "Agent unavailable" message
  * Timeout → show "Request timed out, please try again"

* **Tool execution failures:**
  * Validation errors → AI asks user for correction
  * Canvas errors (object not found, etc.) → AI explains what went wrong
  * Firestore errors → show "Could not save changes" message

* **User experience polish:**
  * Loading states for all async operations
  * Smooth animations for new messages
  * Clear visual feedback for command execution
  * Keyboard shortcuts (Enter to send, Ctrl+Enter for newline)
  * Message timestamp display
  * "AI is typing..." indicator

* **Performance optimizations:**
  * Debounce chat input to prevent excessive typing updates
  * Throttle command queue polling
  * Lazy load old chat messages (pagination)
  * Cache viewport center calculation

* **Testing checklist:**
  * Test all tool functions work correctly
  * Test ambiguous commands trigger clarification
  * Test error handling for invalid inputs
  * Test multi-user command queue
  * Test undo functionality
  * Test complex commands (login form, navigation bar)
  * Test with different canvas states (empty, crowded)
  * Test OpenAI API failure scenarios

---

## **12. Testing Strategy**

### **12.1 Unit Tests**

Write unit tests for:
* All tool wrapper functions (aiCreateRectangle, etc.)
* Command queue logic (add, update, remove)
* Object selection by description
* Arrangement calculations
* Undo logic
* Error handling

Use mocked Firestore and OpenAI API for isolated testing.

### **12.2 Integration Tests**

Test full flow:
* User sends message → command added to queue → AI processes → objects appear → response in chat
* Multiple users sending commands simultaneously
* Undo operations reverting changes correctly
* Error scenarios end-to-end

### **12.3 Manual Testing Checklist**

Before considering Phase 6 complete:

**Basic Commands:**
- [ ] "Create a red rectangle at 1000, 1000" works
- [ ] "Create a blue circle with radius 100" works
- [ ] "Add text that says Hello" works
- [ ] "Move the red rectangle to the center" works
- [ ] "Resize the circle to radius 200" works
- [ ] "Rotate the text 45 degrees" works
- [ ] "Delete the blue circle" works

**Arrangement Commands:**
- [ ] "Arrange these in a horizontal row" works
- [ ] "Create a 3x3 grid of squares" works
- [ ] "Distribute evenly" works

**Complex Commands:**
- [ ] "Create a login form" generates 3+ elements
- [ ] "Build a navigation bar" generates arranged elements
- [ ] Elements positioned at viewport center

**Query Commands:**
- [ ] "What's on the canvas?" lists all objects
- [ ] "Move the red circle on the left" selects correct object

**Undo Commands:**
- [ ] "Undo the last change" reverts last command
- [ ] "Undo the last 3 changes" reverts 3 commands

**Error Handling:**
- [ ] Ambiguous command asks for clarification
- [ ] Invalid parameters show error message
- [ ] Object not found shows helpful message
- [ ] API unavailable shows "Agent unavailable" message

**Multi-User:**
- [ ] Both users see same chat history
- [ ] Both users see same command queue
- [ ] Commands execute in order received
- [ ] AI-generated objects sync to all users

**Performance:**
- [ ] Simple commands respond in <2 seconds
- [ ] Complex commands respond in <5 seconds
- [ ] Chat remains responsive with 50+ messages
- [ ] Queue processes smoothly with 5+ commands

**UX Polish:**
- [ ] Chat auto-scrolls to new messages
- [ ] Typing indicator shows when AI is working
- [ ] Queue updates in real-time
- [ ] Error messages are user-friendly
- [ ] Enter key sends message
- [ ] UI remains responsive during AI processing

---

## **13. Acceptance Criteria Summary**

Phase 6 is complete when:

✅ **Chat Interface:**
- Chat window visible on right side
- Messages sync to all users in real-time
- Input field and send button functional
- AI responses appear after command execution
- Chat history persists across refreshes

✅ **Command Queue:**
- Queue displays pending commands
- Commands execute first-come, first-served
- Queue syncs to all users
- Currently executing command highlighted
- Completed commands removed from queue

✅ **Canvas Features:**
- Circles can be created and manipulated
- Text can be created and manipulated
- Objects can be resized
- Objects can be rotated
- Objects can be deleted
- Objects can be arranged (4 arrangement types)

✅ **AI Commands:**
- At least 6 distinct command types working
- Creation commands (rectangle, circle, text)
- Manipulation commands (move, resize, rotate, delete)
- Layout commands (arrange, distribute)
- Complex commands (login form, etc.)
- Query commands (canvas state, select by description)
- Undo commands (last command, last N commands)

✅ **AI Behavior:**
- Asks for clarification when ambiguous
- Handles errors gracefully
- Provides conversational responses
- Executes tool calls correctly
- Syncs changes to all users

✅ **Performance:**
- Simple commands respond in <2 seconds
- Complex commands respond in <5 seconds
- Chat remains responsive with 50+ messages
- Queue processes smoothly with 5+ commands

✅ **Error Handling:**
- API failures show user-friendly message
- Tool failures explained to user
- Invalid inputs trigger clarification
- Canvas boundary violations handled

✅ **Documentation:**
- All new features documented in README
- Tool function signatures documented
- AI capabilities listed
- Testing scenarios documented

---

## **14. Grading Alignment**

This PRD is designed to meet the rubric requirements:

**Section 4: AI Canvas Agent (25 points)**

* **Command Breadth (10 points):** 8+ distinct commands across all categories
  * Creation: createRectangle, createCircle, createText
  * Manipulation: moveObject, resizeObject, rotateObject, deleteObject
  * Layout: arrangeHorizontal, arrangeVertical, arrangeGrid, distributeEvenly
  * Complex: login form, navigation bar generation
  * Plus queries and undo commands

* **Complex Command Execution (8 points):** "Create a login form" generates 3+ properly arranged elements with smart positioning

* **AI Performance & Reliability (7 points):**
  * <2 second responses for simple commands
  * 90%+ accuracy with proper tool function implementation
  * Natural UX with chat interface and feedback
  * Shared state via Firestore
  * Multi-user support via command queue

**Key Success Factors:**

1. **Complete canvas features FIRST** before AI integration
2. **Test tool functions** in isolation before connecting to OpenAI
3. **Build incrementally:** basic commands → complex commands → error handling
4. **Focus on reliability:** better to have 6 rock-solid commands than 12 flaky ones
5. **User experience matters:** chat interface, queue visibility, error messages

---

**End of AI Agent PRD**