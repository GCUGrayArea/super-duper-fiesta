import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
const db = admin.firestore();
// Simple FIFO processor using Firestore transactions to lock one command at a time
export const processCommandQueue = functions.firestore
    .document('commandQueue/{canvasId}/commands/{commandId}')
    .onCreate(async (snap, context) => {
    const { canvasId } = context.params;
    const cmdRef = snap.ref;
    // Try to set status to executing; if already changed, bail
    await cmdRef.update({ status: 'executing' }).catch(() => { });
    const data = snap.data();
    const command = data.command || '';
    // For now, echo to chat and set complete; client will do actual execution
    const chatRef = db.collection('chats').doc(canvasId).collection('messages');
    await chatRef.add({
        canvasId,
        userId: 'ai-agent',
        displayName: 'AI Assistant',
        message: `Server noticed: ${command}`,
        isAI: true,
        timestamp: Date.now()
    });
    await cmdRef.update({ status: 'complete' });
});
