import Image from "next/image";
import { championImageUrl } from "@/lib/engine/champions";
import { cn } from "@/lib/kl/cn";

/**
 * A champion's square icon from Riot's Data Dragon (bundled in /public/champions, 128px, so it
 * stays sharp up to 64 CSS pixels on a 2x screen). Decorative by default: the name is always
 * written next to it.
 */
export function ChampionIcon({
  champion,
  size = 48,
  className,
  alt = "",
  muted = false,
}: {
  champion: string;
  size?: number;
  className?: string;
  alt?: string;
  /** Greyed out: banned or already picked. */
  muted?: boolean;
}) {
  return (
    <Image
      src={championImageUrl(champion)}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-xs object-cover", muted && "opacity-45 grayscale", className)}
    />
  );
}
