export type MomentKind = "photo" | "milestone";

export type MomentInput = {
  kind: MomentKind;
  momentDate: string;
  caption?: string | undefined;
  childId?: string | undefined;
  milestoneLabel?: string | undefined;
};

export type MomentPhotoInput = MomentInput & {
  fileName: string;
  contentType: string;
  base64: string;
};

export type MomentRow = {
  id: string;
  kind: string;
  momentDate: string;
  caption: string | null;
  milestoneLabel: string | null;
  childId: string | null;
  childName: string | null;
  photoUrl: string | null;
  addedBy: string;
  addedByName: string | null;
  createdAt: string;
};

export type MomentsData = {
  access: "family" | "nanny";
  familyName: string;
  children: { id: string; name: string }[];
  moments: MomentRow[];
};
