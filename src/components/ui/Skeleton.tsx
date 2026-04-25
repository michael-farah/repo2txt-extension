import { cn } from '@/lib/utils/cn';

interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rectangle' | 'tree-node';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  count = 1,
}: SkeletonProps) {
  const lines = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {lines.map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-md shimmer-bg animate-shimmer',
            variant === 'text' && 'h-4 w-full',
            variant === 'circle' && 'rounded-full',
            variant === 'rectangle' && 'rounded-lg',
            variant === 'tree-node' && 'h-8 w-full rounded-lg',
            className,
          )}
          style={{
            width: width ?? (variant === 'circle' ? '2.5rem' : undefined),
            height: height ?? (variant === 'circle' ? '2.5rem' : undefined),
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
