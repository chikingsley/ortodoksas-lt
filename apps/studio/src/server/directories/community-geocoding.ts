import { z } from "zod";

const LITHUANIA_CENTER = {
  latitude: "55.1694",
  longitude: "23.8813",
} as const;
const lithuanianPostalCodePattern = /^\d{5}$/u;

const photonFeatureSchema = z.object({
  geometry: z.object({
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  properties: z
    .object({
      city: z.string().optional(),
      country: z.string().optional(),
      countrycode: z.string().optional(),
      housenumber: z.string().optional(),
      locality: z.string().optional(),
      name: z.string().optional(),
      osm_id: z.number().optional(),
      osm_type: z.string().optional(),
      postcode: z.string().optional(),
      street: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
    })
    .passthrough(),
});

const photonResponseSchema = z.object({
  features: z.array(photonFeatureSchema),
});

export interface CommunityAddressSuggestion {
  addressLabel: string;
  addressLine: string;
  countryCode: string;
  id: string;
  label: string;
  latitude: number;
  locality: string;
  longitude: number;
  postalCode: string;
}

const uniqueParts = (...parts: Array<string | undefined>) =>
  parts.filter(
    (part, index, values): part is string =>
      Boolean(part) && values.indexOf(part) === index
  );

const normalizeLithuanianPostalCode = (
  postalCode: string,
  countryCode: string
) =>
  countryCode === "LT" && lithuanianPostalCodePattern.test(postalCode)
    ? `LT-${postalCode}`
    : postalCode;

const toAddressSuggestion = (
  feature: z.infer<typeof photonFeatureSchema>
): CommunityAddressSuggestion | null => {
  const { properties } = feature;
  const countryCode = properties.countrycode?.toUpperCase() ?? "";
  if (countryCode !== "LT") {
    return null;
  }

  const addressLine = uniqueParts(
    properties.street,
    properties.housenumber
  ).join(" ");
  const locality =
    properties.city ??
    properties.town ??
    properties.village ??
    properties.locality ??
    "";
  const postalCode = normalizeLithuanianPostalCode(
    properties.postcode ?? "",
    countryCode
  );
  const localityLine = uniqueParts(postalCode, locality).join(" ");
  const addressLabel = uniqueParts(addressLine, localityLine).join(", ");
  const label = uniqueParts(
    properties.name,
    addressLine,
    localityLine,
    properties.country
  ).join(", ");
  const [longitude, latitude] = feature.geometry.coordinates;
  if (!(label && Number.isFinite(latitude) && Number.isFinite(longitude))) {
    return null;
  }

  return {
    addressLabel: addressLabel || label,
    addressLine: addressLine || properties.name || "",
    countryCode,
    id: `${properties.osm_type ?? "place"}-${properties.osm_id ?? `${latitude}-${longitude}`}`,
    label,
    latitude,
    locality,
    longitude,
    postalCode,
  };
};

export const searchCommunityAddresses = async (
  query: string
): Promise<CommunityAddressSuggestion[]> => {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${query}, Lithuania`);
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycode", "LT");
  url.searchParams.set("lat", LITHUANIA_CENTER.latitude);
  url.searchParams.set("lon", LITHUANIA_CENTER.longitude);
  url.searchParams.set("zoom", "6");

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error("Address search is temporarily unavailable.");
  }

  const payload = photonResponseSchema.parse(await response.json());
  const results = payload.features
    .map(toAddressSuggestion)
    .filter(
      (suggestion): suggestion is CommunityAddressSuggestion =>
        suggestion !== null
    );
  return [
    ...new Map(
      results.map((suggestion) => [suggestion.id, suggestion])
    ).values(),
  ].slice(0, 6);
};
