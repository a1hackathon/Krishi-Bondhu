"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Area, District, Division, Upazila } from "@/server/location/types";

type Named = { name: string; bnName: string };

// Bangla names are shown when the page is in Bangla; English otherwise.
function displayName(item: Named, locale: string) {
  return locale === "bn" ? item.bnName : item.name;
}

function sortByName<T extends Named>(items: T[], locale: string): T[] {
  return [...items].sort((a, b) =>
    displayName(a, locale).localeCompare(displayName(b, locale), locale)
  );
}

type Props = {
  divisions: Division[];
  districts: District[];
  upazilas: Upazila[];
  areas: Area[];
  selection: LocationSelection;
  onChange: (selection: LocationSelection) => void;
};

export type LocationSelection = { divisionId: string; districtId: string; upazilaId: string; areaId: string };

// Four dependent dropdowns: each choice filters the next and clears everything below it.
export function LocationPicker({ divisions, districts, upazilas, areas, selection, onChange }: Props) {
  const locale = useLocale();
  const t = useTranslations("location");

  const sortedDivisions = useMemo(
    () => sortByName(divisions, locale),
    [divisions, locale]
  );

  const visibleDistricts = useMemo(
    () =>
      sortByName(
        districts.filter((d) => String(d.divisionId) === selection.divisionId),
        locale
      ),
    [districts, selection.divisionId, locale]
  );

  const visibleUpazilas = useMemo(
    () =>
      sortByName(
        upazilas.filter((u) => String(u.districtId) === selection.districtId),
        locale
      ),
    [upazilas, selection.districtId, locale]
  );

  const visibleAreas = useMemo(
    () =>
      sortByName(
        areas.filter((a) => String(a.upazilaId) === selection.upazilaId),
        locale
      ),
    [areas, selection.upazilaId, locale]
  );

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("division")}</span>
        <Select
          value={selection.divisionId}
          onValueChange={(value) => {
            onChange({ divisionId: value, districtId: "", upazilaId: "", areaId: "" });
          }}
        >
          <SelectTrigger aria-label={t("division")}>
            <SelectValue placeholder={t("selectDivision")} />
          </SelectTrigger>
          <SelectContent>
            {sortedDivisions.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {displayName(d, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("district")}</span>
        <Select
          value={selection.districtId}
          disabled={!selection.divisionId}
          onValueChange={(value) => {
            onChange({ ...selection, districtId: value, upazilaId: "", areaId: "" });
          }}
        >
          <SelectTrigger aria-label={t("district")}>
            <SelectValue placeholder={t("selectDistrict")} />
          </SelectTrigger>
          <SelectContent>
            {visibleDistricts.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {displayName(d, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("upazila")}</span>
        <Select
          value={selection.upazilaId}
          disabled={!selection.districtId}
          onValueChange={(value) => {
            onChange({ ...selection, upazilaId: value, areaId: "" });
          }}
        >
          <SelectTrigger aria-label={t("upazila")}>
            <SelectValue placeholder={t("selectUpazila")} />
          </SelectTrigger>
          <SelectContent>
            {visibleUpazilas.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {displayName(u, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("area")}</span>
        <Select
          value={selection.areaId}
          disabled={!selection.upazilaId}
          onValueChange={(value) => onChange({ ...selection, areaId: value })}
        >
          <SelectTrigger aria-label={t("area")}>
            <SelectValue placeholder={t("selectArea")} />
          </SelectTrigger>
          <SelectContent>
            {visibleAreas.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {displayName(a, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selection.upazilaId && visibleAreas.length === 0 && (
        <p className="text-xs text-muted-foreground sm:col-span-2">{t("noAreasForUpazila")}</p>
      )}
    </div>
  );
}
