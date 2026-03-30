import { releaseCodeSchema } from "@/features/release-intake/schemas";

export function parseReleaseCode(releaseCode: string) {
  const parsed = releaseCodeSchema.parse(releaseCode);
  const match = /^(R|RMK|RME|A)(\d+)$/.exec(parsed);

  if (!match) {
    throw new Error("Invalid release code.");
  }

  return {
    releaseType: match[1]!,
    sequence: Number.parseInt(match[2]!, 10),
  };
}

export function shouldFlagBaselineStale(input: {
  baselineApprovedAt: Date | null;
  manifest: Array<{ affectsBaseline: boolean }>;
}) {
  return (
    input.baselineApprovedAt !== null &&
    input.manifest.some((item) => item.affectsBaseline)
  );
}
