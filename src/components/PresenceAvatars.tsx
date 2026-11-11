import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";

import { getPeopleFn, heartbeatFn, saveMyPhotoFn } from "@/lib/presence.functions";

export const PHOTO_INPUT_ID = "my-photo-input";

/** Crops to a centred square and shrinks to 256px so uploads stay tiny. */
async function toSquareJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't read that photo.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** Top-right headshots for the parent and nanny(s), with a red dot while someone is in the app. */
export function PresenceAvatars({ slug }: { slug: string }) {
  const client = useQueryClient();
  const heartbeat = useServerFn(heartbeatFn);
  const loadFn = useServerFn(getPeopleFn);
  const saveFn = useServerFn(saveMyPhotoFn);
  const people = useQuery({
    queryKey: ["people", slug],
    queryFn: () => loadFn({ data: { slug } }),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const beat = () => {
      if (!document.hidden) void heartbeat({ data: { slug } }).catch(() => {});
    };
    beat();
    const t = setInterval(beat, 60_000);
    return () => clearInterval(t);
  }, [slug, heartbeat]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await saveFn({ data: { slug, contentType: "image/jpeg", base64: await toSquareJpeg(file) } });
      await client.invalidateQueries({ queryKey: ["people", slug] });
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that photo.");
    }
  };

  return (
    <div className="flex items-center -space-x-1.5">
      <input
        id={PHOTO_INPUT_ID}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {(people.data?.people ?? []).map((p) => {
        const face = p.photoUrl ? (
          <img src={p.photoUrl} alt={p.name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground">
            {p.name.trim().charAt(0).toUpperCase()}
          </span>
        );
        const label = `${p.name}${p.online ? " · online" : ""}${p.isYou && !p.photoUrl ? " · tap to add your photo" : ""}`;
        return (
          <span key={p.key} className="relative h-9 w-9 flex-none rounded-full ring-2 ring-background" title={label}>
            {p.isYou && slug !== "demo" ? (
              <button
                type="button"
                aria-label={p.photoUrl ? "Change your photo" : "Add your photo"}
                className={`h-full w-full rounded-full ${p.photoUrl ? "" : "outline-dashed outline-1 outline-offset-1 outline-primary"}`}
                onClick={() => document.getElementById(PHOTO_INPUT_ID)?.click()}
              >
                {face}
              </button>
            ) : (
              face
            )}
            {p.online && (
              <span
                role="img"
                aria-label={`${p.name} is online`}
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background"
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
