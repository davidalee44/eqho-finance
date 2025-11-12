import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

/**
 * Wrapper component for draggable/resizable cards
 * Used with react-grid-layout
 */
export function DraggableCard({ children, className = '', ...props }) {
  return (
    <Card className={`relative ${className}`} {...props}>
      <div className="absolute top-2 right-2 cursor-move opacity-30 hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      {children}
    </Card>
  );
}

