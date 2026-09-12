import { 
  ChevronDown, 
  SignalHigh, 
  CircleDot, 
  CalendarDays, 
  Tag, 
  UserCheck, 
  UserPlus, 
  Edit3, 
  AlignLeft, 
  Sliders, 
  Activity 
} from "lucide-react";

export interface TaskUpdateItem {
  _id?: string;
  user: {
    name: string;
    avatarUrl?: string;
    email?: string;
  };
  type: string;
  message: string;
  timestamp: string | Date;
}

interface TaskUpdatesPanelProps {
  updates?: TaskUpdateItem[];
}

function formatRelativeTime(dateInput: string | Date): string {
  try {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getUpdateIcon(type: string) {
  switch (type) {
    case "priority":
      return <SignalHigh className="w-3.5 h-3.5 text-red-500" />;
    case "status":
      return <CircleDot className="w-3.5 h-3.5 text-blue-500" />;
    case "dueDate":
      return <CalendarDays className="w-3.5 h-3.5 text-orange-500" />;
    case "tags":
      return <Tag className="w-3.5 h-3.5 text-purple-500" />;
    case "assignee":
      return <UserCheck className="w-3.5 h-3.5 text-emerald-500" />;
    case "member":
      return <UserPlus className="w-3.5 h-3.5 text-indigo-500" />;
    case "title":
      return <Edit3 className="w-3.5 h-3.5 text-amber-500" />;
    case "description":
      return <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

export function TaskUpdatesPanel({ updates = [] }: TaskUpdatesPanelProps) {
  const sortedUpdates = [...updates].reverse();

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-4 h-4" />
          Updates
          {sortedUpdates.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-normal">
              {sortedUpdates.length}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {sortedUpdates.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2 text-center">
            No updates recorded yet.
          </div>
        ) : (
          sortedUpdates.map((item, index) => {
            const isLast = index === sortedUpdates.length - 1;
            const userName = item.user?.name || item.user?.email || "User";
            const timeAgo = formatRelativeTime(item.timestamp);

            return (
              <div key={item._id || index} className="flex gap-3 relative group">
                <div className="w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center shrink-0 z-10 border-2 border-card shadow-xs">
                  {item.user?.avatarUrl ? (
                    <img 
                      src={item.user.avatarUrl} 
                      alt={userName} 
                      className="w-full h-full rounded-full object-cover" 
                    />
                  ) : (
                    getUpdateIcon(item.type)
                  )}
                </div>

                {/* Vertical line connecting updates */}
                {!isLast && (
                  <div className="absolute top-6 left-3 bottom-[-16px] w-px bg-border" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {userName}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug break-words">
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
