export type Signature = {
  docKind: "agreement" | "terms";
  signerRole: "parent" | "nanny" | "agency";
  signerName: string;
  docVersion: string;
  signedAt: string;
};
