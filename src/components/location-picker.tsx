"use client";

import { useMemo, useState } from "react";
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
};

// Four dependent dropdowns: each choice filters the next and clears everything below it.
export function LocationPicker({ divisions, districts, upazilas, areas }: Props) {
  const locale = useLocale();
  const t = useTranslations("location");
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [upazilaId, setUpazilaId] = useState("");
  const [areaId, setAreaId] = useState("");

  const sortedDivisions = useMemo(
    () => sortByName(divisions, locale),
    [divisions, locale]
  );

  const visibleDistricts = useMemo(
    () =>
      sortByName(
        districts.filter((d) => String(d.divisionId) === divisionId),
        locale
      ),
    [districts, divisionId, locale]
  );

  const visibleUpazilas = useMemo(
    () =>
      sortByName(
        upazilas.filter((u) => String(u.districtId) === districtId),
        locale
      ),
    [upazilas, districtId, locale]
  );

  const visibleAreas = useMemo(
    () =>
      sortByName(
        areas.filter((a) => String(a.upazilaId) === upazilaId),
        locale
      ),
    [areas, upazilaId, locale]
  );

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("division")}</span>
        <Select
          value={divisionId}
          onValueChange={(value) => {
            setDivisionId(value);
            setDistrictId("");
            setUpazilaId("");
            setAreaId("");
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
          value={districtId}
          disabled={!divisionId}
          onValueChange={(value) => {
            setDistrictId(value);
            setUpazilaId("");
            setAreaId("");
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
          value={upazilaId}
          disabled={!districtId}
          onValueChange={(value) => {
            setUpazilaId(value);
            setAreaId("");
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
          value={areaId}
          disabled={!upazilaId}
          onValueChange={setAreaId}
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
    </div>
  );
}
