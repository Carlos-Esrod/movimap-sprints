import type { LucideIcon } from 'lucide-react';
import { Map as MapIcon, PlusCircle, Activity as ActivityIcon, LifeBuoy, Settings, LogOut, Search, X, ChevronDown, Locate, Navigation, Camera, Calendar, Clock, Info, Share2, MessageSquare, ThumbsUp, ThumbsDown, Check, AlertTriangle, Sparkles, CheckCircle2, Ban, Hourglass } from 'lucide-react';

export type IconName =
  | 'map'
  | 'report'
  | 'activity'
  | 'help'
  | 'settings'
  | 'logout'
  | 'search'
  | 'close'
  | 'chevron-down'
  | 'locate'
  | 'navigation'
  | 'camera'
  | 'calendar'
  | 'clock'
  | 'info'
  | 'share'
  | 'comments'
  | 'thumbs-up'
  | 'thumbs-down'
  | 'check'
  | 'alert'
  | 'sparkles'
  | 'check-circle'
  | 'ban'
  | 'hourglass';

const icons: Record<IconName, LucideIcon> = {
  map: MapIcon,
  report: PlusCircle,
  activity: ActivityIcon,
  help: LifeBuoy,
  settings: Settings,
  logout: LogOut,
  search: Search,
  close: X,
  'chevron-down': ChevronDown,
  locate: Locate,
  navigation: Navigation,
  camera: Camera,
  calendar: Calendar,
  clock: Clock,
  info: Info,
  share: Share2,
  comments: MessageSquare,
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  check: Check,
  alert: AlertTriangle,
  sparkles: Sparkles,
  'check-circle': CheckCircle2,
  ban: Ban,
  hourglass: Hourglass,
};

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

function Icon({ name, className, size = 20, strokeWidth = 2 }: IconProps) {
  const Cmp = icons[name];
  if (!Cmp) return null;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} />;
}

export default Icon;

export const iconNames = Object.keys(icons) as IconName[];
