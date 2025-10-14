# **Collab Canvas — MVP PRD (Gauntlet AI Project)**

## **1. Overview**

**Goal:**
Build a minimal but rock-solid real-time collaborative design tool (a Figma-like clone) that allows multiple authenticated users to draw, move, and sync objects in real time.

The MVP’s purpose is to prove the stability of the **multiplayer foundation** — real-time synchronization, cursor sharing, and presence awareness — not to deliver visual richness or AI functionality.

---

## **2. User Stories**

### **Primary User Type: User / Designer**

* **As a user**, I want to create an account so I can log in and collaborate on the canvas.
* **As a designer**, I can create a **rectangle** on a shared canvas so that I can visualize and communicate ideas.
* **As a designer**, I can **click a button** to create a rectangle that appears at the **center of my current viewport**, so I can quickly start designing.
* **As a designer**, I can move and resize shapes so that I can adjust my layout.
* **As a designer**, I can pan and zoom the canvas smoothly to explore different areas of my design space.
* **As a designer**, I can see my collaborators’ cursors and names in real time so I know who’s editing where.
* **As a designer**, I can see which collaborators are currently online and editing.
* **As a designer**, I can refresh or reconnect and have my canvas return to its previous state.

### **Secondary User Type: Team Member / Viewer**

* **As a team member**, I can log in with my name or account and observe live edits on the canvas without conflicts.
* **As a team member**, I can make edits that immediately sync with others’ screens (<100 ms latency).

### **Tertiary User Type: Admin / Owner (Optional for MVP)**

* **As an admin**, I can manage user authentication and view all connected users.

---

## **3. Key Features (MVP Scope)**

### **Core Canvas**

* **Canvas workspace:**

  * One **shared canvas** for all users.
  * Fixed size of **5,000 × 5,000 pixels**.
  * Later versions will implement **multiple canvases (“rooms”)** for collaboration spaces.
* **Shape support:**

  * Only **rectangle** objects for MVP (created via single-click).
  * Button to create a rectangle at the **center of current viewport**.
* **Object operations:**

  * Move and resize rectangles.
  * Delete objects.
  * Pan by dragging with no object selected.
  * Zoom with scroll wheel.
  
* **Performance:**

  * Maintain **60 FPS** for pan, zoom, and object manipulation.
* **Persistence:**

  * Canvas state saved in Firestore; reloaded automatically on reconnect.

### **Real-Time Collaboration**

* **Multi-user editing:** 2+ users can create and move shapes simultaneously.
* **Live cursors:** Show user names and positions in real time.
* **Presence awareness:** Display list of online users.
* **Conflict handling:**

  * **First-mover lock system:**

    * When a user starts editing an object, it becomes **locked** for others.
    * Locked objects appear **grayed or desaturated**.
    * The lock releases on **edit end (mouse up)** or after **5 seconds of inactivity**.
* **Persistence:** Canvas state stable across disconnects.
* **Performance targets:**

  * <50 ms latency for cursor updates.
  * <100 ms for object syncs.
  * Stable for 5+ users and 500+ objects.

### **Authentication**

* **Email/password sign-up** and **anonymous guest login** both supported.
* Store minimal profile info (display name, unique ID).
* Integrate authentication with presence tracking.

### **Deployment**

* Deployed and **publicly accessible**.
* Hosted on **Vercel** (preferred), **Firebase Hosting**, or **Render**.

---

## **4. Tech Stack Proposal**

| Layer                            | Recommended Tools                  | Notes / Alternatives                                      | Considerations                                                                          |
| -------------------------------- | ---------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Frontend**                     | React + TypeScript                 | Vue or Svelte optional                                    | Use `Konva.js` or `Fabric.js` for canvas rendering; React + Redux for state management. |
| **Backend (Sync + Persistence)** | Firebase (Firestore + Realtime DB) | Supabase (Postgres + Realtime) or custom WebSocket server | Firebase Realtime DB offers low-latency sync and presence tracking.                     |
| **Auth**                         | Firebase Auth                      | Supabase Auth                                             | Supports both permanent and temporary sessions.                                         |
| **Deployment**                   | Vercel                             | Firebase Hosting                                          | Vercel is simplest for React + Firebase apps.                                           |
| **State Management**             | Redux                              | —                                                         | Predictable updates, easily expandable for undo/redo later.                             |

---

## **5. Out of Scope (Not in MVP)**

| Category                         | Description                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- |
| **AI Commands**                  | Natural language canvas manipulation (“Create a blue rectangle,” etc.).      |
| **Advanced Shapes / Components** | Circles, polygons, custom paths, images, or complex components.              |
| **Grouping / Alignment Tools**   | Align, distribute, or grid arrangement features.                             |
| **Undo / Redo**                  | Full history or time-travel editing.                                         |
| **Complex Transformations**      | Rotation, scaling from multiple points, etc.                                 |
| **Version Control / Export**     | Saving canvases as files or exporting assets.                                |
| **Mobile Responsiveness**        | Desktop web only for MVP.                                                    |
| **Access Control**               | Canvas sharing permissions or role management.                               |
| **Multi-Canvas Rooms**           | Only one shared global canvas for MVP. Multi-room support planned for later. |

---

## **6. Technical Risks & Challenges**

| Risk                                  | Description                                                           | Mitigation                                                                            |
| ------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Real-time performance degradation** | Too many update broadcasts can cause jitter or lag.                   | Use debounced updates for cursor positions and delta-based object sync.               |
| **Lock management conflicts**         | Overlapping locks or failure to release after disconnect.             | Implement dual unlock (on edit end or 5 s inactivity). Log lock events for debugging. |
| **Persistence complexity**            | Syncing state between transient real-time updates and saved DB state. | Use Firestore listeners; save periodically and on disconnect.                         |
| **Authentication latency**            | Auth initialization delay before presence tracking.                   | Preload auth before workspace entry; cache tokens locally.                            |
| **Scalability (5+ users)**            | Performance may degrade with multiple concurrent edits.               | Simulate loads early; throttle update frequency for heavy scenes.                     |

---

## **7. Summary of MVP Deliverable**

**What “Done” Means:**
✅ Single shared 5,000×5,000 px canvas
✅ Rectangle shape creation via button (centered on viewport)
✅ Pan and zoom
✅ Real-time sync between 2+ users
✅ Multiplayer cursors with names
✅ Presence awareness
✅ Conflict-free editing using first-mover lock system
✅ Authentication (email + guest)
✅ Deployed, public, stable, and fast

---

## **8. Post-MVP Roadmap**

| Phase                                   | Feature                     | Description                                                                        | Priority |
| --------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- | -------- |
| **Phase 2: Multi-Canvas Collaboration** | Canvas “rooms”              | Allow multiple canvases/projects with joinable links; separate real-time sessions. | High     |
| **Phase 2: Shape Expansion**            | Circles, text layers        | Introduce new object types and transformations.                                    | High     |
| **Phase 3: Enhanced Editing**           | Undo/Redo, grouping         | Add editing history and grouping functionality.                                    | Medium   |
| **Phase 3: AI Integration**             | Natural language commands   | Implement AI agent for canvas manipulation (“Create a login form,” etc.).          | High     |
| **Phase 4: User Experience**            | Export, sharing permissions | Enable export (SVG/PNG), user roles, and private canvases.                         | Medium   |
| **Phase 4: Performance Scaling**        | Optimized rendering         | Handle 10+ users and 1,000+ objects with stable performance.                       | Medium   |
