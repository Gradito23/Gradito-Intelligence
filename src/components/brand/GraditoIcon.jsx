import { cn } from '@/lib/utils';

/**
 * Gradito brand mark (stylized G / ring). Color via CSS currentColor / text-*.
 */
export default function GraditoIcon({ className, title = 'Gradito', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 75 71"
      fill="currentColor"
      className={cn('shrink-0', className)}
      role="img"
      aria-label={title}
      {...props}
    >
      <title>{title}</title>
      <path d="M37.5,0C16.8,0,0,15.9,0,35.5c0,18.9,15.7,34.4,35.4,35.4V57.7c-9.7-1-17.3-9.3-17.3-19.3c0-3.6,1-8.2,2.8-12.6 c0.4-0.9,1.3-1.6,2.3-1.6h28.6c1,0,1.9,0.6,2.3,1.6c1.8,4.4,2.8,8.9,2.8,12.6c0,10-7.6,18.2-17.3,19.3V71C59.3,70,75,54.5,75,35.6 C75,15.9,58.2,0,37.5,0z" />
    </svg>
  );
}
