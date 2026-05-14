/**
 * Country flag badge — CSS-gradient approximation matching the design kit.
 * See: NEW PLAN/Global Health Design System/ui_kits/admin/Atoms.jsx (FlagBadge).
 */

const FLAGS: Record<string, string> = {
  ie: "linear-gradient(to right, #169B62 33%, #fff 33% 66%, #FF883E 66%)",
  pt: "linear-gradient(to right, #046A38 40%, #DA291C 40%)",
  es: "linear-gradient(to bottom, #AA151B 25%, #F1BF00 25% 75%, #AA151B 75%)",
  cz: "linear-gradient(to bottom, #fff 50%, #D7141A 50%)",
  rm: "linear-gradient(to right, #002B7F 33%, #FCD116 33% 66%, #CE1126 66%)",
  ro: "linear-gradient(to right, #002B7F 33%, #FCD116 33% 66%, #CE1126 66%)",
  all: "linear-gradient(135deg, #1B4D3E, #C8E6A0)",
};

export function FlagBadge({
  code,
  size = 18,
}: {
  code: string;
  size?: number;
}) {
  const key = code.toLowerCase();
  return (
    <span
      title={code.toUpperCase()}
      aria-hidden
      style={{
        width: size + 8,
        height: size,
        borderRadius: 3,
        background: FLAGS[key] ?? "#e5e7eb",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
        flex: `0 0 ${size + 8}px`,
        display: "inline-block",
      }}
    />
  );
}
