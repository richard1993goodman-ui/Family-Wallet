export type MomentKind = "photo" | "milestone";

export type MomentInput = {
  kind: MomentKind;
  momentDate: string;
  caption?: string;
  childId?: string;
  milestoneLabel?: string;
};

export type MomentPhotoInput = MomentInput & {
  fileName: string;
  contentType: string;
  base64: string;
};
