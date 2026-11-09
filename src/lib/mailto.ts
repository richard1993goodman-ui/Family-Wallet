import { toast } from "sonner";

import { copyText } from "@/components/CopyButton";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * Click handler for email links. A mailto link silently does nothing on a computer with no mail app set up,
 * so we also copy the address and say so. The link itself still opens the person's mail app where there is one.
 */
export function onMailtoClick() {
  void copyText(CONTACT_EMAIL).then((copied) =>
    toast.info(
      copied
        ? `If your email app doesn't open, ${CONTACT_EMAIL} is copied. Paste it into a new email.`
        : `If your email app doesn't open, write to ${CONTACT_EMAIL}.`,
      { duration: 8000 },
    ),
  );
}
