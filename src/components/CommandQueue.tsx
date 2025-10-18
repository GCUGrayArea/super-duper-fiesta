import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';

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

export function CommandQueue({ canvasId }: { canvasId: string }) {
  const [queue, setQueue] = useState<QueuedCommand[]>([]);

  useEffect(() => {
    const ref = collection(db, `commandQueue/${canvasId}/commands`);
    const q = query(ref, orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: QueuedCommand[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setQueue(items);
    });
    return unsub;
  }, [canvasId]);

  return (
    <div className="bg-white border rounded p-2 text-sm">
      <div className="font-medium mb-1">AI Command Queue</div>
      {queue.length === 0 ? (
        <div className="text-gray-500 text-xs">No pending commands</div>
      ) : (
        <ul className="space-y-1">
          {queue.map(item => (
            <li key={item.id} className={`flex items-center justify-between px-2 py-1 rounded border ${item.status === 'executing' ? 'bg-yellow-50 border-yellow-200' : item.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex-1 min-w-0 pr-2">
                <div className="truncate"><span className="text-gray-800 font-medium">{item.displayName}</span>: {item.command}</div>
                {item.status === 'failed' && item.errorMessage && (
                  <div className="text-[11px] text-red-700 truncate">{item.errorMessage}</div>
                )}
              </div>
              <span className={`text-[11px] shrink-0 ${item.status === 'executing' ? 'text-yellow-700' : item.status === 'failed' ? 'text-red-700' : 'text-gray-700'}`}>{item.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



