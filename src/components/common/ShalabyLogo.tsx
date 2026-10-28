interface Props {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  onClick?: () => void;
}
export function ShalabyLogo({
  className = "",
  size = "md",
  showText = true,
  onClick,
}: Props) {
  return (
    <div
      className={`shalaby-wordmark wordmark-${size} ${className}`}
      onClick={onClick}
      aria-label="شلبي"
    >
      <span className="wordmark-name">
        شلبي
        <span className="wordmark-square" aria-hidden="true" />
      </span>
      {showText && (
        <span className="wordmark-description">إدارة المبيعات</span>
      )}
    </div>
  );
}
