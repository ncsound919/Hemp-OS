import { BIOMASS_PROFILES } from './calibration/profiles.ts';
import { Biomass } from './core/types.ts';

/**
 * Matches a strain by name or chemical composition (THC/CBD) to the closest calibrated biomass profile.
 * Generates and returns a complete, structurally valid Biomass object.
 */
export function matchBiomassProfile(strainName: string, thc?: number, cbd?: number): Biomass {
  const profiles = Object.values(BIOMASS_PROFILES);
  let matchedProfile = profiles[0]; // default fallback (Cherry Wine High CBD)

  if (thc !== undefined && cbd !== undefined) {
    if (thc > 12) {
      const thcaProf = profiles.find(p => p.id === 'thca_platinum');
      if (thcaProf) matchedProfile = thcaProf;
    } else if (cbd > 8) {
      const cbdProf = profiles.find(p => p.id === 'cbd_cherry_wine');
      if (cbdProf) matchedProfile = cbdProf;
    } else {
      const industrialProf = profiles.find(p => p.id === 'industrial_fiber_hemp');
      if (industrialProf) matchedProfile = industrialProf;
    }
  } else {
    const lower = strainName.toLowerCase();
    const found = profiles.find(p => 
      p.name.toLowerCase().includes(lower) || 
      p.biomassTemplate.name.toLowerCase().includes(lower)
    );
    if (found) {
      matchedProfile = found;
    }
  }

  return {
    id: `matched_${matchedProfile.id}_${Date.now()}`,
    name: matchedProfile.biomassTemplate.name,
    mass: 10.0, // standard default feedstock input mass (kg)
    moisture: matchedProfile.biomassTemplate.moisture,
    waxContent: matchedProfile.biomassTemplate.waxContent,
    potency: { ...matchedProfile.biomassTemplate.potency }
  };
}
