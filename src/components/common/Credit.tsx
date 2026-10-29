interface Props {
  /** "dark" for the login screen (light text on a dark card), otherwise the muted colour of the app. */
  tone?: "app" | "dark";
  className?: string;
}

/** The copyright line at the bottom of the menu and of the sign-in screen. */
export function Credit({ tone = "app", className = "" }: Props) {
  return (
    <div className={`credit is-${tone} ${className}`}>
      <small>
        <bdi dir="ltr">© {new Date().getFullYear()} SABER GROUP</bdi> · جميع الحقوق محفوظة
      </small>
    </div>
  );
}
