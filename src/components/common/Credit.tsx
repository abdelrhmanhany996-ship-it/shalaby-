interface Props {
  /** "dark" for the login screen (light text on a dark card), otherwise the muted colour of the app. */
  tone?: "app" | "dark";
  className?: string;
}

/** The maker's line shown at the bottom of the menu and of the sign-in screen. */
export function Credit({ tone = "app", className = "" }: Props) {
  return (
    <div className={`credit is-${tone} ${className}`}>
      <span className="credit-by" dir="ltr">
        <i className="credit-dot" aria-hidden="true" />
        Developed by <b>SABER GROUP</b>
      </span>
      <small>© {new Date().getFullYear()} SABER GROUP. جميع الحقوق محفوظة.</small>
    </div>
  );
}
