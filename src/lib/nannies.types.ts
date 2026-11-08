export type NannyInput = {
  id?: string;
  name: string;
  /** One of the values in staff-roles.ts. Defaults to nanny. */
  role?: string;
  bio?: string;
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
};
