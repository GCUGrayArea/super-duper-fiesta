PROJECT_TASKS.md - Collab Canvas MVP (Updated with Reordered Phases)
Project Overview
Building a real-time collaborative design tool (Figma-like clone) with multiplayer foundation, focusing on stability and synchronization rather than visual richness.

Phase 0: Environment Strategy
0.1 Firebase Project Setup

✅ Create development Firebase project for testing
✅ Create production Firebase project for deployment
✅ Document Firebase project IDs and configuration for both environments
✅ Set up environment variable files for dev and prod (.env.development, .env.production)


Phase 1: Project Setup & Infrastructure
1.1 Development Environment Setup

✅ Initialize React + TypeScript project with Vite
✅ Configure ESLint and Prettier for code quality
✅ Set up Git repository with appropriate .gitignore
✅ Create basic project folder structure (components, hooks, utils, types, store)
✅ Install core dependencies: React, TypeScript, Redux Toolkit, Fabric.js
✅ Install testing dependencies: Vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
✅ Configure Vitest test runner
✅ Set up test file structure (__tests__ directories or .test.ts files)
✅ Create test utilities and common mocks

1.2 Firebase Configuration (Dev & Prod)

✅ Enable Firebase Authentication in both projects
✅ Enable Firestore Database in both projects
✅ Enable Firebase Realtime Database for presence/cursors in both projects
✅ Configure Firebase security rules for authentication
✅ Add Firebase SDK to project and create configuration files
✅ Set up environment variables for Firebase config (dev and prod)
✅ Create Firebase initialization utility that switches based on environment
✅ Write unit tests for Firebase initialization utility (environment switching)

1.3 Deployment Setup

✅ Create Vercel account and link repository
✅ Configure Vercel project settings
✅ Set up environment variables in Vercel (production Firebase config)
✅ Configure deployment preview settings (use dev Firebase)
✅ Test initial deployment


Phase 2: Authentication System
2.1 Authentication UI

✅ Create login page component
✅ Create signup page component with display name field
✅ Create authentication form with email/password fields
✅ Add form validation for email and password
✅ Add optional display name input with placeholder text
✅ Add loading states for authentication actions
✅ Create error message display component
✅ Write unit tests for form validation logic
✅ Write unit tests for error message display component

2.2 Authentication Logic

✅ Implement Firebase email/password signup
✅ Use full email address as fallback display name when displayName is null
✅ Implement Firebase email/password login
✅ Create authentication state management with Redux Toolkit
✅ Implement logout functionality
✅ Add user session persistence
✅ Create authentication route guards/protection
✅ Store user profile data (display name, unique ID, email) in Firestore
✅ Write unit tests for display name extraction from email
✅ Write unit tests for authentication Redux slice (actions and reducers)
✅ Write unit tests for route guard logic

2.3 User Profile Management

✅ Create user profile data structure in Firestore
✅ Save display name during signup
✅ Generate unique user IDs
✅ Create user profile retrieval logic
✅ Calculate user color hash for cursor (hash last char of email → color index)
✅ Write unit tests for user color hash calculation
✅ Write unit tests for color index mapping (all 16 hex chars → 8 colors)


Phase 3: Canvas Core Implementation & UI (DO THIS FIRST AFTER AUTH)
3.1 Object Data Model

 Define TypeScript interfaces for canvas objects
 Define Rectangle object type with properties:

id (string - unique identifier)
type (literal: "rectangle")
x (number - position)
y (number - position)
width (number - 150 default)
height (number - 150 default)
fill (string - color from predefined palette)
stroke (string - "black")
strokeWidth (number - 1)
opacity (number - 1.0)
zIndex (number - for layer ordering)
createdAt (timestamp)
updatedAt (timestamp)


 Create object state management with Redux Toolkit slices
 Implement object ID generation system (UUID)
 Create object serialization/deserialization utilities
 Define color palette constant: ['crimson', 'hotpink', 'darkorange', 'gold', 'darkmagenta', 'chartreuse', 'cadetblue', 'saddlebrown']
 Write unit tests for object serialization/deserialization
 Write unit tests for object ID generation (uniqueness)
 Write unit tests for TypeScript type guards (isRectangle, etc.)

3.2 Toolbar Component (Top Position)

 Create horizontal toolbar component at top of screen
 Add "Add Rectangle" button with icon
 Add "Delete" button (enabled only when object selected)
 Add online users list section (placeholder for now)
 Add connection status indicator (placeholder for now)
 Style toolbar with consistent design (background, padding, borders)
 Make toolbar fixed position (doesn't scroll with canvas)
 Write unit tests for toolbar component rendering
 Write unit tests for delete button enabled/disabled state

3.3 Canvas Setup with Fabric.js

 Install Fabric.js library
 Create main Canvas component
 Initialize Fabric.js canvas with 5,000×5,000px workspace
 Configure Fabric.js rendering settings for performance
 Set up canvas coordinate system
 Add canvas background (light gray or white)

3.4 Viewport Controls

 Set initial viewport position to center (2,500, 2,500)
 Implement pan functionality (drag with no object selected)
 Implement zoom functionality with mouse wheel
 Set zoom limits: min 10%, max 400%
 Constrain panning to canvas boundaries (0-5,000 on both axes)
 Create viewport state management with Redux Toolkit
 Ensure smooth 60 FPS performance during pan/zoom
 Add viewport position persistence
 Write unit tests for viewport boundary constraint logic
 Write unit tests for zoom limit enforcement
 Write unit tests for viewport Redux slice (actions and reducers)
 Write unit tests for initial viewport position calculation

3.5 Canvas Interaction States & Visual Feedback

 Implement grab cursor during pan
 Implement crosshair cursor during rectangle creation (if applicable)
 Implement move cursor during object drag
 Implement resize cursors during object resize
 Implement default cursor for general canvas interaction
 Add hover states for toolbar buttons
 Show tooltips for toolbar buttons on hover
 Display tooltip for pan instruction ("Drag canvas to pan")
 Display tooltip for zoom instruction ("Scroll to zoom")
 Change cursor style for different actions
 Add smooth transitions for UI state changes
 Write unit tests for cursor state management

3.6 Rectangle Creation

 Calculate viewport center coordinates
 Implement rectangle creation at viewport center
 Randomly select color from palette for new rectangle
 Set default rectangle properties (150×150px, selected color, black 1px border, 100% opacity)
 Assign highest zIndex (current max + 1) to new rectangle
 Add created rectangle to canvas state
 Render rectangle on Fabric.js canvas
 Write unit tests for viewport center calculation with different zoom levels
 Write unit tests for random color selection (ensure all 8 colors can be selected)
 Write unit tests for default rectangle property assignment
 Write unit tests for zIndex calculation (max + 1 logic)

3.7 Overlap Detection & Notification System

 Implement overlap detection when new rectangle is created
 Create non-blocking notification component (semi-transparent, auto-fading)
 Display notification when overlap detected: "Shape overlaps with existing object and has been brought to front"
 Implement auto-fade animation (fade out over 2-3 seconds)
 Write unit tests for overlap detection algorithm (various scenarios)
 Write unit tests for notification component (mounting, auto-dismiss timer)
 Write unit tests for notification system (display, auto-dismiss)

3.8 Object Selection

 Implement click detection on Fabric.js objects
 Select topmost object when clicking on overlaps (highest zIndex)
 Create selection state management in Redux
 Add visual selection indicator (Fabric.js selection handles)
 Implement deselection on canvas background click
 Ensure selection doesn't trigger on locked objects (prepare for lock system)
 Write unit tests for topmost object selection logic (multiple overlapping objects)
 Write unit tests for selection Redux slice
 Write unit tests for locked object selection prevention

3.9 Object Movement

 Implement drag-to-move functionality for rectangles using Fabric.js
 Track mouse down/move/up events
 Update zIndex to front (max + 1) when drag starts
 Update object position during drag
 Implement 5px movement threshold for sync (prepare for sync)
 Ensure smooth movement at 60 FPS
 Write unit tests for 5px movement threshold detection
 Write unit tests for zIndex update on drag start
 Write unit tests for position delta calculation

3.10 Object Resizing

 Enable Fabric.js resize handles on selected rectangles
 Implement resize drag functionality
 Update object dimensions during resize
 Implement 5px size change threshold for sync (prepare for sync)
 Maintain proportional scaling (optional based on shift key)
 Write unit tests for 5px size change threshold detection
 Write unit tests for dimension validation (min/max sizes if applicable)

3.11 Object Deletion

 Implement keyboard shortcut (Delete/Backspace key)
 Implement object deletion logic
 Remove object from Fabric.js canvas
 Remove object from Redux state
 Update delete button state based on selection
 Write unit tests for deletion Redux actions
 Write unit tests for keyboard shortcut handler

3.12 Z-Index Management

 Implement function to calculate next zIndex (current max + 1)
 Update zIndex on object creation
 Update zIndex when object is dragged
 Update zIndex when object is resized
 Sort objects by zIndex for proper rendering order
 Write unit tests for zIndex calculation with empty canvas
 Write unit tests for zIndex calculation with existing objects
 Write unit tests for object sorting by zIndex

3.13 Empty State & User Guidance

 Create empty canvas state message ("Click 'Add Rectangle' to get started")
 Add keyboard shortcut hints in UI (Delete key, etc.)
 Write unit tests for empty state component

3.14 Local Canvas Testing

 Test rectangle creation at viewport center
 Test rectangle color randomization (all 8 colors appear)
 Test default rectangle properties (150×150, 1px black border, 100% opacity)
 Test object selection (click to select)
 Test object selection on overlaps (selects topmost)
 Test object deselection (click canvas background)
 Test object movement (drag)
 Test object resizing with handles
 Test object deletion (button and keyboard shortcut)
 Test zIndex updates (new objects on top, dragged objects to front)
 Test overlap notification display and auto-fade
 Test initial viewport position (centered at 2,500, 2,500)
 Test pan functionality in all directions
 Test pan boundary constraints (stops at canvas edges)
 Test zoom in with mouse wheel
 Test zoom out with mouse wheel
 Test zoom limits (10% min, 400% max)
 Test 60 FPS during pan operations
 Test 60 FPS during zoom operations
 Test 60 FPS during object drag
 Test toolbar button interactions
 Test cursor style changes for different actions


Phase 4: Real-Time Synchronization
4.1 Firestore Data Structure

 Design Firestore document structure:

Collection: canvases
Document ID: main (single shared canvas)
Fields: objects (array), lastUpdated (timestamp)


 Create utility functions for Firestore operations
 Implement Firestore security rules for authenticated users
 Write unit tests for Firestore utility functions (with mocked Firestore)

4.2 Firestore Integration

 Implement real-time listener for canvas document
 Create object creation sync to Firestore
 Create object update sync (position, size, zIndex)
 Create object deletion sync
 Handle Firestore connection/disconnection events
 Implement error handling for Firestore operations
 Write unit tests for Firestore sync functions (with mocked Firestore)
 Write unit tests for connection event handlers

4.3 Optimized Update Strategy

 Implement position change detection (>5px threshold)
 Implement size change detection (>5px threshold)
 Track last sync position/size for threshold calculation
 Batch updates on mouseup event
 Send immediate update if threshold exceeded during drag
 Optimize update payload to include only changed fields
 Target <100ms sync latency
 Write unit tests for position change threshold (4px = no sync, 6px = sync)
 Write unit tests for size change threshold detection
 Write unit tests for last sync state tracking
 Write unit tests for update payload construction (only changed fields)

4.4 State Reconciliation

 Handle incoming updates from Firestore listener
 Merge remote changes with local state
 Prevent echo updates (ignore updates from current user)
 Resolve conflicts with last-write-wins strategy
 Update Fabric.js canvas objects from Firestore changes
 Implement reconnection logic with full state reload
 Handle array index synchronization for object updates
 Write unit tests for echo update prevention
 Write unit tests for state merging logic (local + remote changes)
 Write unit tests for conflict resolution (last-write-wins)

4.5 Sync Testing - 2 Users

 Test simultaneous rectangle creation (both appear)
 Test real-time object position sync
 Test real-time object resize sync
 Test real-time object deletion sync
 Verify <100ms object sync latency
 Test state persistence after disconnect/reconnect


Phase 5: Multiplayer Features
5.1 Presence System with Realtime Database

 Set up Firebase Realtime Database for presence
 Create presence data structure: presence/{userId} with fields:

displayName (string)
email (string, optional)
color (string - computed from hash)
online (boolean)
lastSeen (timestamp)


 Implement user online detection on authentication
 Add user to presence list with .onDisconnect() cleanup
 Remove user from presence on disconnect/logout
 Create presence state management in Redux Toolkit
 Implement presence listener for real-time updates
 Write unit tests for presence Redux slice
 Write unit tests for presence data structure validation

5.2 User Color Assignment

 Create hash function for email/displayName
 Extract last hex character from hash
 Map hex character to color index (0-1→crimson, 2-3→hotpink, 4-5→darkorange, 6-7→gold, 8-9→darkmagenta, a-b→chartreuse, c-d→cadetblue, e-f→saddlebrown)
 Assign color to user on login
 Store color in presence data
 Use color for cursor rendering
 Write unit tests for hash function (consistent output for same input)
 Write unit tests for hex character extraction
 Write unit tests for color mapping (all 16 hex chars → correct colors)
 Write unit tests for edge cases (empty string, special characters)

5.3 Presence UI in Toolbar

 Update online users list component in toolbar (from placeholder)
 Display user display names with color indicators
 Show user count (e.g., "3 users online")
 Update UI in real-time as users join/leave
 Add styling for current user in list
 Write unit tests for user list component rendering
 Write unit tests for user count calculation

5.4 Live Cursors

 Implement cursor position tracking on canvas mousemove
 Send cursor updates to Realtime Database at cursors/{userId}
 Throttle cursor updates to <50ms (aim for ~20 updates/second)
 Create cursor component: 20px circle with user's assigned color
 Add user name label next to cursor
 Render other users' cursors on canvas overlay
 Remove cursor when user disconnects
 Hide cursor when user's mouse leaves canvas
 Write unit tests for cursor throttling logic
 Write unit tests for cursor component rendering (props)
 Write unit tests for cursor position calculation

5.5 Cursor Testing - Multiple Users

 Test cursor position updates (<50ms latency)
 Test cursor color matches user's assigned color
 Test cursor name label displays correctly
 Test cursor rendering for 5+ users
 Test cursor removal on disconnect
 Test cursor hide on mouse leave canvas

5.6 Collaborative Locking System

 Design lock data structure in Realtime Database: locks/{objectId}

userId (string)
displayName (string)
timestamp (number)


 Implement lock acquisition on drag start (mousedown)
 Implement lock acquisition on resize start
 Write lock to Realtime Database
 Broadcast lock state to all users
 Release lock on mouseup (end of drag/resize)
 Implement 5-second inactivity timer (resets on each movement)
 Auto-release lock after 5 seconds of no movement
 Create lock state management in Redux Toolkit
 Add .onDisconnect() cleanup for locks
 Write unit tests for lock acquisition logic
 Write unit tests for lock release on mouseup
 Write unit tests for 5-second inactivity timer (with timer mocks)
 Write unit tests for timer reset on movement
 Write unit tests for lock Redux slice

5.7 Lock Visual Indicators

 Gray out locked objects (reduce opacity to 50% or desaturate)
 Add text label showing "Locked by [Username]" near locked object
 Update Fabric.js object appearance when locked
 Prevent selection of locked objects by other users
 Prevent drag/resize of locked objects by other users
 Show visual feedback when attempting to interact with locked object
 Update connection status indicator in toolbar (from placeholder)
 Write unit tests for lock visual state calculations
 Write unit tests for locked object interaction prevention

5.8 Lock System Testing - Multiple Users

 Test lock acquisition when user starts dragging
 Test lock prevents other users from editing same object
 Test locked object appears grayed out to other users
 Test "Locked by [Username]" label displays
 Test lock release on mouseup
 Test lock auto-release after 5 seconds of inactivity
 Test lock cleanup on user disconnect
 Test stale lock handling after browser crash (5-second timeout)
 Test lock conflicts (multiple users trying to edit different objects)

5.9 Comprehensive Multiplayer Testing - 5+ Users

 Test real-time sync with 5 concurrent users
 Test presence list accuracy with 5+ users
 Test performance with 5+ users making rapid changes
 Verify <100ms object sync latency with multiple users
 Verify <50ms cursor latency with multiple users


Phase 6: Performance Optimization
6.1 Fabric.js Rendering Optimization

 Enable Fabric.js object caching
 Optimize Fabric.js rendering settings (renderOnAddRemove: false during batch operations)
 Implement viewport culling (only render visible objects if needed)
 Use requestAnimationFrame for smooth animations
 Profile rendering performance with Chrome DevTools
 Maintain 60 FPS target during pan/zoom
 Test with 500+ objects on canvas

6.2 Network Optimization

 Implement update batching for multiple rapid changes
 Use Firestore transaction for atomic updates
 Minimize payload sizes (send only changed fields)
 Implement cursor update throttling (50ms intervals)
 Use Realtime Database for ephemeral data (cursors, presence)
 Use Firestore for persistent data (canvas objects)
 Test latency with 5+ concurrent users in different locations
 Write unit tests for update batching logic
 Write unit tests for payload optimization (only changed fields included)

6.3 Redux State Management Optimization

 Use Redux Toolkit createSlice for reducers
 Implement selectors with createSelector for memoization
 Use useSelector with shallow equality checks
 Avoid unnecessary re-renders with React.memo where appropriate
 Profile Redux state updates with Redux DevTools
 Normalize state shape for efficient updates
 Write unit tests for Redux selectors (memoization behavior)
 Write unit tests for selector performance with large datasets

6.4 Performance Testing with Load

 Create canvas with 500+ rectangles
 Test pan/zoom performance with 500+ objects
 Test object creation with 500+ existing objects
 Profile memory usage during extended session
 Test network bandwidth usage
 Verify 60 FPS maintained with heavy load


Phase 7: Persistence & Reliability
7.1 Canvas State Persistence

 Save canvas state to Firestore on object changes
 Implement debounced auto-save (every 2-3 seconds during active editing)
 Save full state on user disconnect/logout
 Load canvas state from Firestore on initial connection
 Restore viewport position from local storage
 Handle empty canvas state (first load)
 Handle corrupted state gracefully with fallback
 Write unit tests for debounced auto-save logic (with timer mocks)
 Write unit tests for state loading with various data conditions
 Write unit tests for corrupted state handling

7.2 Error Handling

 Add React error boundaries for component crashes
 Implement Firestore error handling with user-friendly messages
 Add Realtime Database error handling
 Handle authentication errors gracefully
 Create error notification component (using existing notification system)
 Implement retry logic for failed Firestore writes
 Add console logging for debugging (development only)
 Log critical errors to console in production
 Write unit tests for error boundary component
 Write unit tests for retry logic (with exponential backoff)
 Write unit tests for error message formatting

7.3 Connection Management

 Detect network disconnections using Realtime Database .info/connected
 Update connection status indicator in toolbar
 Implement automatic reconnection on network restore
 Queue local updates during offline periods (optional for MVP)
 Display "reconnecting" message to user
 Reload canvas state on reconnection
 Handle stale lock cleanup after reconnection
 Write unit tests for connection status detection
 Write unit tests for reconnection logic
 Write unit tests for update queue management (if implemented)

7.4 Persistence & Reliability Testing

 Test canvas state save on object changes
 Test canvas state load on page refresh
 Test state persistence after logout and login
 Test reconnection after network disconnect
 Test lock cleanup after reconnection
 Test state recovery from corrupted data
 Test behavior when Firestore is temporarily unavailable
 Test viewport persistence across page refreshes


Phase 8: Cross-Browser Testing & Quality Assurance
8.1 Unit Test Coverage Review

 Run test coverage report (aim for >80% coverage on utility functions)
 Identify untested critical paths
 Add missing unit tests for edge cases
 Review and refactor flaky tests
 Ensure all tests pass in CI/CD pipeline
 Replace Firebase error messages with user-friendly error messages

8.2 Cross-Browser Functional Testing

 Test full functionality on Chrome (latest)
 Test full functionality on Firefox (latest)
 Test full functionality on Safari (latest)
 Test full functionality on Edge (latest)
 Fix any browser-specific rendering issues
 Fix any browser-specific event handling issues

8.3 Final Integration Testing

 Run complete authentication flow tests
 Run complete canvas interaction tests
 Run complete multiplayer sync tests
 Run complete lock system tests
 Run complete presence/cursor tests
 Verify all acceptance criteria are met


Phase 9: Documentation
9.1 Code Documentation

 Add TSDoc comments to all interfaces and types
 Document Redux slice structures and actions
 Document Firestore data structure
 Document Realtime Database data structure
 Add comments for complex algorithms (zIndex calculation, lock system, cursor hashing)
 Document color palette and selection logic
 Create architecture diagram showing data flow
 Document unit test structure and conventions

9.2 Setup Documentation

 Create comprehensive README.md with:

Project overview and features
Tech stack list
Prerequisites (Node version, npm/yarn)
Installation steps
Firebase setup instructions (dev and prod)
Environment variable configuration
Running development server
Running unit tests
Building for production
Deployment instructions


 Document Firebase security rules setup
 Create troubleshooting guide for common issues
 Document testing strategy and how to run tests

9.3 User Documentation

 Create user guide with:

How to sign up / log in
How to create rectangles
How to move and resize objects
How to delete objects
How to pan and zoom
Keyboard shortcuts list
Understanding locked objects
Understanding user cursors and colors


 Add inline help text in UI where appropriate


Phase 10: Final Deployment
10.1 Pre-Deployment Checklist

 Review and fix all known bugs
 Verify all MVP acceptance criteria are met
 Run full unit test suite and ensure 100% pass rate
 Run full functional test suite across all browsers
 Verify performance metrics meet targets
 Review Firebase security rules for production
 Check for console errors in production build
 Remove debug logging from production code
 Verify environment variables are correctly set
 Test production build locally
 Review test coverage report (>80% on critical paths)

10.2 Production Deployment

 Switch Vercel environment to use production Firebase config
 Deploy to Vercel production environment
 Verify deployment success
 Test production URL with multiple users
 Verify Firestore connection in production
 Verify Realtime Database connection in production
 Verify authentication works in production
 Monitor initial production performance

10.3 Post-Deployment Monitoring

 Monitor Vercel deployment logs
 Monitor Firebase usage metrics
 Check for authentication errors
 Check for Firestore errors
 Test with real users (5+ simultaneous)
 Gather initial user feedback
 Create issue tracking system (GitHub Issues)
 Document any production issues and fixes

10.4 Optional: Monitoring Setup

 Set up error tracking (e.g., Sentry) - optional
 Set up analytics (e.g., Google Analytics) - optional
 Create performance monitoring dashboard - optional


MVP Completion Criteria
The MVP is considered complete when all of the following are verified:
✅ Canvas Foundation

Single shared 5,000×5,000px canvas is functional
Initial viewport centered at (2,500, 2,500)
Pan and zoom work smoothly at 60 FPS
Panning stops at canvas boundaries

✅ Shape Creation & Manipulation

Rectangle creation button places 150×150px shapes at viewport center
Rectangles have random colors from 8-color palette
Rectangles have 1px black border and 100% opacity
Object selection works correctly (topmost on overlap)
Objects can be moved and resized smoothly
Objects can be deleted via button or Delete key
Z-index management works (new/dragged objects to front)
Overlap notification displays and auto-fades

✅ Real-Time Synchronization

Real-time sync works between 2+ users with <100ms latency
Object updates sync only on >5px change or mouseup
State persists and reloads correctly
Last-write-wins conflict resolution works

✅ Multiplayer Features

Multiplayer cursors display with names at <50ms latency
Cursor colors match user's assigned color (20px circles)
Presence awareness shows online users accurately
First-mover lock system prevents editing conflicts
Locked objects appear grayed with "Locked by [User]" label
Locks release on mouseup or after 5 seconds of inactivity
Stale locks cleaned up on disconnect

✅ Authentication

Email/password signup with optional display name
Email address used as fallback display name when displayName is null
Session persistence works across refreshes

✅ Performance & Stability

Application deployed publicly on Vercel
Stable with 5+ users editing simultaneously
Stable with 500+ objects on canvas
60 FPS maintained during all interactions
Cursor latency <50ms
Object sync latency <100ms

✅ User Experience

Top toolbar with all necessary controls
Connection status indicator visible
Non-blocking notifications for overlaps
Clear visual feedback for all interactions
Works correctly in Chrome, Firefox, Safari, and Edge

✅ Code Quality & Testing

Unit test coverage >80% on critical utility functions
All unit tests passing
All functional tests passing


Implementation Notes for AI Agents
Development Sequence - CRITICAL
The phases must be completed in this order:

Phase 0-1: Setup & Infrastructure
Phase 2: Authentication (needed for user identification)
Phase 3: Canvas Core Implementation & UI (TEST EVERYTHING LOCALLY FIRST)
Phase 4: Real-Time Synchronization (build on working local canvas)
Phase 5: Multiplayer Features (build on working sync)
Phase 6-10: Optimization, Testing, Documentation, Deployment

Why Phase 3 (Canvas) must come before sync:

Validates core interactions work smoothly locally
Establishes baseline performance (60 FPS target)
Tests object manipulation before adding network complexity
Ensures UI/UX is solid before multiplayer
Makes debugging easier (local issues vs. network issues)

    Allows for rapid iteration without Firebase costs during development

Priority Principles

    Local first, then distributed: Get canvas working perfectly locally before adding Firebase
    Stability over features: Focus on rock-solid real-time sync and multiplayer
    Test frequently: Test after each subsection within Phase 3, then after each phase
    Monitor performance: Check latency and FPS throughout development
    Keep it modular: Structure code for easy post-MVP expansion

Key Technical Decisions (Locked In)

    Canvas library: Fabric.js
    State management: Redux Toolkit
    Backend: Firebase (Firestore + Realtime Database)
    Deployment: Vercel
    Color palette: 8 fixed colors (crimson, hotpink, darkorange, gold, darkmagenta, chartreuse, cadetblue, saddlebrown)
    Update threshold: 5px movement or mouseup
    Lock timeout: 5 seconds of inactivity
    Data structure: Single Firestore document with object array

Development Workflow Recommendations

    Set up both dev and prod Firebase projects early
    Use dev environment for all testing
    Complete Phase 3 entirely before moving to Phase 4 (verify local canvas works perfectly)
    Test multiplayer features by opening multiple browser windows/tabs
    Use Redux DevTools for debugging state changes
    Use Firebase Emulator Suite for local testing (optional but recommended)
    Deploy to Vercel preview branches for testing before production

Phase 3 (Canvas) Testing Strategy

Since Phase 3 must be completed and tested before moving to sync:

    Test each subsection independently (viewport, then creation, then selection, etc.)
    Create a test plan with 10-20 rectangles for interaction testing
    Verify 60 FPS during all operations before moving forward
    Test edge cases (canvas boundaries, overlapping objects, rapid creation)
    Get feedback on UX/feel before proceeding to Phase 4

Common Pitfalls to Avoid

    Don't skip Phase 3 testing: Sync issues are much harder to debug than local issues
    Don't sync every single mouse movement (use thresholds)
    Don't forget .onDisconnect() cleanup for presence and locks
    Don't render cursors for the current user
    Don't ignore the 5,000×5,000 canvas boundary
    Don't forget to update zIndex when objects are dragged
    Don't send echo updates back to the user who made the change
    Don't add Firebase integration until Phase 3 is complete and tested

Testing Strategy by Phase

Phase 3 Testing (Local Canvas):

    Manual testing with browser DevTools (FPS counter)
    Unit tests for all utility functions
    Component tests for toolbar and canvas interactions
    Test with 100+ rectangles to verify performance
    Get "sign-off" that canvas feels good before Phase 4

Phase 4 Testing (Sync):

    Test with 2 browser windows/tabs first
    Use network throttling in DevTools to simulate latency
    Verify sync works before moving to Phase 5
    Test reconnection scenarios

Phase 5 Testing (Multiplayer):

    Test with 2 users first (cursors, presence, locks)
    Scale to 5+ users
    Test high-frequency actions (rapid clicking, dragging)
    Verify performance doesn't degrade

Phase 6-7 Testing (Optimization & Reliability):

    Load testing with 500+ objects
    Extended session testing (30+ minutes)
    Network disconnect/reconnect scenarios
    Cross-browser compatibility

Performance Benchmarks to Track

During Phase 3 (before adding network):

    60 FPS during pan (local only)
    60 FPS during zoom (local only)
    60 FPS during drag (local only)
    Smooth interactions with 100+ objects
    No lag during rapid object creation

After Phase 4 (with sync):

    <100ms sync latency for object updates
    No FPS degradation with sync enabled
    Smooth experience with 2 users

After Phase 5 (with multiplayer):

    <50ms cursor latency
    No FPS degradation with 5+ users
    Lock acquisition/release feels instant

After Phase 6 (optimization):

    Stable with 500+ objects
    Memory usage reasonable over 30+ minutes
    Network bandwidth usage acceptable

When to Move Between Phases

✅ Phase 1 → Phase 2: When project setup is complete and you can run npm run dev

✅ Phase 2 → Phase 3: When authentication works (can sign up, log in, log out) and user profile/color is calculated

Phase 3 → Phase 4: ONLY when:

    All Phase 3 tasks are complete ✅
    Canvas feels smooth and responsive ✅
    All local tests pass ✅
    60 FPS is maintained ✅
    Toolbar, selection, drag, resize, delete all work perfectly ✅
    Unit tests for Phase 3 all pass ✅

Phase 4 → Phase 5: When:

    Object sync works between 2 users ✅
    <100ms latency achieved ✅
    State persistence works ✅
    Reconnection logic tested ✅

Phase 5 → Phase 6: When:

    Cursors working for multiple users ✅
    Presence list accurate ✅
    Lock system prevents conflicts ✅
    All multiplayer features tested with 5+ users ✅

Phase 6 → Phase 7: When:

    Performance targets met with load ✅
    500+ objects tested ✅
    Memory usage acceptable ✅

Phase 7 → Phase 8: When:

    Persistence working ✅
    Error handling complete ✅
    Connection management robust ✅

Phase 8 → Phase 9: When:

    All tests pass ✅
    Cross-browser tested ✅
    All acceptance criteria met ✅

Phase 9 → Phase 10: When:

    Documentation complete ✅
    Code review done ✅
    Ready for deployment ✅

Critical Success Factors

    Phase 3 must be rock solid before any network features
    Test with real users at each phase completion
    Monitor Firebase quotas to avoid surprise costs
    Keep Redux state normalized for performance
    Use memoization to prevent unnecessary re-renders
    Throttle/debounce high-frequency events
    Clean up listeners to prevent memory leaks
    Handle edge cases (disconnects, errors, conflicts)

Debugging Tips

For Phase 3 (Local Canvas):

    Use Chrome DevTools Performance tab
    Enable FPS meter in Chrome
    Use Redux DevTools to track state changes
    Add console.time/timeEnd for performance critical code
    Test with React DevTools Profiler

For Phase 4 (Sync):

    Use Firebase console to watch database updates in real-time
    Add logging for sync events (but remove before production)
    Test with Network throttling (Fast 3G, Slow 3G)
    Use multiple browsers to test sync, not just tabs

For Phase 5 (Multiplayer):

    Use Realtime Database dashboard to watch presence/cursors/locks
    Test with actual geographic distance (VPN or remote testers)
    Monitor Firebase usage to ensure within free tier during development
    Use incognito/private windows for true multi-user testing

For Phase 6 (Performance):

    Profile with 500+ objects using Chrome DevTools
    Use Performance Monitor in Chrome DevTools
    Test on lower-end hardware if available
    Monitor Firebase bandwidth usage

Cost Management

Development Phase:

    Use Firebase free tier (Spark plan) for development project
    Monitor quotas regularly (50K reads/day, 20K writes/day on free tier)
    Use Firebase Emulator Suite for local testing when possible
    Keep test sessions short to conserve quota

Production Phase:

    Start with Firebase free tier
    Monitor usage in Firebase console
    Set up billing alerts if upgrading to paid plan
    Optimize queries to minimize reads/writes

Git Workflow Recommendations

    Create feature branches for each phase:
        feature/auth
        feature/canvas-core
        feature/sync
        feature/multiplayer
        etc.
    Commit frequently with clear messages:
        feat: implement rectangle creation
        test: add unit tests for zIndex calculation
        fix: resolve pan boundary constraint issue
        perf: optimize cursor update throttling
    Merge to main only after phase completion and testing
    Tag releases:
        v0.1.0-canvas (after Phase 3)
        v0.2.0-sync (after Phase 4)
        v0.3.0-multiplayer (after Phase 5)
        v1.0.0 (MVP complete)

Emergency Rollback Plan

If issues arise in production:

    Vercel allows instant rollback to previous deployment
    Keep production Firebase separate from development
    Have Firebase security rules backed up
    Document all environment variables
    Keep README updated with deployment instructions

Appendix: Color Mapping Reference

User Color Assignment (based on hash of email/displayName):

    Last hex character: 0-1 → crimson
    Last hex character: 2-3 → hotpink
    Last hex character: 4-5 → darkorange
    Last hex character: 6-7 → gold
    Last hex character: 8-9 → darkmagenta
    Last hex character: a-b → chartreuse
    Last hex character: c-d → cadetblue
    Last hex character: e-f → saddlebrown

Rectangle Color Assignment: Randomly selected from the same 8-color palette on creation.
Appendix: Quick Reference Checklist

Before Starting Development:

    Read entire PRD thoroughly
    Understand the phase sequence and why it matters
    Set up both Firebase projects (dev and prod)
    Understand the color mapping system
    Review the acceptance criteria

Before Moving from Phase 3 to Phase 4:

    Canvas works perfectly locally
    All interactions feel smooth (60 FPS)
    Toolbar fully functional
    All unit tests pass
    Manual testing complete with 100+ objects
    Get stakeholder approval on canvas UX

Before Deploying to Production:

    All phases complete
    All tests passing (unit + functional + cross-browser)
    Performance benchmarks met
    Documentation complete
    Production Firebase configured
    Environment variables set in Vercel
    Security rules reviewed
    Test with 5+ real users

Post-MVP Success Metrics:

    Number of concurrent users handled
    Average sync latency
    Average cursor latency
    User feedback on UX
    Firebase costs
    Uptime percentage
    Bug count in production

Final Notes

This task list is designed to be completed by AI agents with human oversight at key milestones. The most critical decision point is completing Phase 3 before moving to Phase 4. A solid local canvas foundation makes everything else easier.

The MVP focuses on proving the multiplayer architecture works reliably. Visual polish and advanced features are explicitly out of scope. The goal is a stable, fast, collaborative canvas that multiple users can edit simultaneously without conflicts.

Success means: 5+ users can collaborate in real-time, with smooth interactions, low latency, and zero data loss.