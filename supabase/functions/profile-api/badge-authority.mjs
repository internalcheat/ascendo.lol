const authorizedProfiles = new Set(['internalcheats','k3rlsen']);

export function badgeCapabilities(ownedProfile) {
  return { canUseReservedBadges: authorizedProfiles.has(ownedProfile?.slug) };
}
