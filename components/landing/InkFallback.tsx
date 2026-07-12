export function InkFallback({ progress }: { progress: number }) {
  return (
    <div className="ink-fallback" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <path
          className="ink-fallback__halo"
          pathLength="1"
          style={{ strokeDashoffset: 1 - progress }}
          d="M780 -40 C760 140 495 145 530 300 C565 455 755 410 650 555 C545 700 310 570 365 760 C405 895 650 825 530 1050"
        />
        <path
          className="ink-fallback__core"
          pathLength="1"
          style={{ strokeDashoffset: 1 - progress }}
          d="M780 -40 C760 140 495 145 530 300 C565 455 755 410 650 555 C545 700 310 570 365 760 C405 895 650 825 530 1050"
        />
      </svg>
    </div>
  );
}
