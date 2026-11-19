// Shapes of the location rows passed from the server to the picker.
// Hierarchy: division > district > upazila > area.

export type Division = { id: number; name: string; bnName: string };
export type District = { id: number; divisionId: number; name: string; bnName: string };
export type Upazila = { id: number; districtId: number; name: string; bnName: string };
export type Area = { id: number; upazilaId: number; districtId: number; name: string; bnName: string };

export type LocationData = {
  divisions: Division[];
  districts: District[];
  upazilas: Upazila[];
  areas: Area[];
};
