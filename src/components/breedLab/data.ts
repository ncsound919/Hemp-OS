import { Strain } from './types';

export const INITIAL_STRAINS: Strain[] = [
  {
    id: 'strain-blue-dream',
    name: "Blue Dream",
    type: 'Type I (THC Dominant)',
    thc: 18.5,
    cbd: 0.15,
    cbg: 0.85,
    cbn: 0.05,
    terpenes: { myrcene: 0.65, limonene: 0.22, caryophyllene: 0.38, pinene: 0.48, linalool: 0.12 },
    classification: 'Sativa-dominant Hybrid',
    lineage: ['Blueberry', 'Haze'],
    origin: 'A legendary West Coast strain bred in California. Famous for physical relaxation combined with deep mental cerebral stimulation. A consumer-favorite classic.',
    landraceBackground: 'Heirloom Thai Sativa (Haze) backcrossed with landrace Hindu Kush (Blueberry).',
    leaflyInfo: {
      effects: ['Happy', 'Creative', 'Relaxed', 'Uplifted', 'Euphoric'],
      flavors: ['Berry', 'Sweet', 'Earthy'],
      rating: 4.3,
      reviewsCount: 14220,
      popularReview: "The quintessential morning smoke. It lifts my mood, enhances creativity, and leaves a delicious sweet blueberry smell in the air."
    },
    seedFinderInfo: {
      breeder: "Santa Cruz Clone Pool",
      floweringTimeDays: 65,
      heightCm: 140,
      environment: 'Multi-environment',
      availability: 'Highly Available',
      yieldGPerM2: 600
    },
    cannaConnectionInfo: {
      seedBank: "Humboldt Seed Organization",
      climateTolerance: 'Temperate',
      difficulty: 'Easy',
      thcRange: 'High',
      cbdRange: 'None'
    },
    hytivaInfo: {
      activities: ['Socializing', 'Yoga', 'Painting', 'Listening to Music'],
      terpeneDominance: 'Myrcene-dominant',
      medicalIndications: ['Anxiety', 'Depression', 'Chronic Pain', 'Fatigue']
    },
    allBudInfo: {
      avgPricePerGram: 10.50,
      dispensaryStates: ['CA', 'CO', 'OR', 'WA', 'AZ', 'NV', 'MI', 'MA'],
      retailStatus: 'In Stock',
      thcMax: 24.0
    }
  },
  {
    id: 'strain-sour-diesel',
    name: "Sour Diesel",
    type: 'Type I (THC Dominant)',
    thc: 21.8,
    cbd: 0.22,
    cbg: 1.10,
    cbn: 0.08,
    terpenes: { myrcene: 0.15, limonene: 0.72, caryophyllene: 0.64, pinene: 0.18, linalool: 0.08 },
    classification: 'Sativa-dominant Hybrid',
    lineage: ['Chemdawg', 'Super Skunk'],
    origin: 'First appearing on the East Coast in the early 1990s. Famous for its heavy chemical diesel aroma, intense rush of cerebral energy, and social, talkative effects.',
    landraceBackground: 'Derived from ancient Thai sativas crossed with highly selected Afghan and Pakistani landrace indica descendants.',
    leaflyInfo: {
      effects: ['Energetic', 'Creative', 'Focused', 'Uplifted', 'Happy'],
      flavors: ['Diesel', 'Chemical', 'Citrus'],
      rating: 4.2,
      reviewsCount: 8850,
      popularReview: "Smells strongly of kerosene and sour lime. Absolute powerhouse of productivity. It makes complex analytical tasks feel like a breeze!"
    },
    seedFinderInfo: {
      breeder: "Reservada Privada",
      floweringTimeDays: 73,
      heightCm: 160,
      environment: 'Indoor',
      availability: 'Highly Available',
      yieldGPerM2: 500
    },
    cannaConnectionInfo: {
      seedBank: "Sensi Seeds",
      climateTolerance: 'Warm',
      difficulty: 'Experienced',
      thcRange: 'Extreme',
      cbdRange: 'None'
    },
    hytivaInfo: {
      activities: ['Studying', 'Exercising', 'Coding', 'Socializing'],
      terpeneDominance: 'Limonene-dominant',
      medicalIndications: ['Stress', 'Fatigue', 'Depression', 'ADHD']
    },
    allBudInfo: {
      avgPricePerGram: 13.00,
      dispensaryStates: ['NY', 'CA', 'CO', 'MA', 'OR', 'IL', 'MI'],
      retailStatus: 'In Stock',
      thcMax: 26.5
    }
  },
  {
    id: 'strain-gg4',
    name: "Gorilla Glue #4 (GG4)",
    type: 'Type I (THC Dominant)',
    thc: 24.5,
    cbd: 0.10,
    cbg: 1.30,
    cbn: 0.15,
    terpenes: { myrcene: 0.88, limonene: 0.12, caryophyllene: 0.85, pinene: 0.10, linalool: 0.25 },
    classification: 'Indica-dominant Hybrid',
    lineage: ["Chem's Sister", 'Sour Dubb', 'Chocolate Diesel'],
    origin: 'Bred by Joesy Whales. Named Gorilla Glue due to the sticky resin coatings that glued trimming scissors together. Known for producing couch-lock sedation.',
    landraceBackground: 'Complex pedigree tracing to elite domestic clones backcrossed with high-THC skunk lines.',
    leaflyInfo: {
      effects: ['Relaxed', 'Sleepy', 'Hungry', 'Euphoric', 'Uplifted'],
      flavors: ['Earthy', 'Pine', 'Sour'],
      rating: 4.5,
      reviewsCount: 9640,
      popularReview: "This strain will physically fuse you into your couch. The body high is incredibly heavy, relieving deep muscle tension."
    },
    seedFinderInfo: {
      breeder: "GG Strains LLC",
      floweringTimeDays: 60,
      heightCm: 115,
      environment: 'Multi-environment',
      availability: 'Clone-only',
      yieldGPerM2: 550
    },
    cannaConnectionInfo: {
      seedBank: "Certified Clone Archive",
      climateTolerance: 'Temperate',
      difficulty: 'Medium',
      thcRange: 'Extreme',
      cbdRange: 'None'
    },
    hytivaInfo: {
      activities: ['Sleeping', 'Watching Movies', 'Listening to Music', 'Meditating'],
      terpeneDominance: 'Caryophyllene-dominant',
      medicalIndications: ['Insomnia', 'Chronic Pain', 'Muscle Spasms', 'Appetite Loss']
    },
    allBudInfo: {
      avgPricePerGram: 12.00,
      dispensaryStates: ['CA', 'CO', 'WA', 'OR', 'AZ', 'FL', 'NV', 'MI'],
      retailStatus: 'In Stock',
      thcMax: 29.0
    }
  },
  {
    id: 'strain-charlottes-web',
    name: "Charlotte's Web",
    type: 'Type III (CBD Dominant)',
    thc: 0.28,
    cbd: 16.4,
    cbg: 0.65,
    cbn: 0.05,
    terpenes: { myrcene: 0.58, limonene: 0.12, caryophyllene: 0.38, pinene: 0.45, linalool: 0.18 },
    classification: 'Medical / Therapeutic Hemp',
    lineage: ['Industrial Hemp', 'ACDC'],
    origin: 'Bred in Colorado by the Stanley Brothers. Cultivated for ultra-low psychoactivity and elevated CBD. Pivotal in early pediatric epilepsy research and US hemp legalization milestones.',
    landraceBackground: 'Derived from cold-hardy European fiber hemp lines crossed with highly selected high-resin resin clones.',
    leaflyInfo: {
      effects: ['Focused', 'Calm', 'Relaxed', 'Happy'],
      flavors: ['Earthy', 'Woody', 'Pine'],
      rating: 4.6,
      reviewsCount: 3200,
      popularReview: "Completely clear-headed relief. Clears up joint pain and calms my mind without any high."
    },
    seedFinderInfo: {
      breeder: "Stanley Brothers",
      floweringTimeDays: 58,
      heightCm: 100,
      environment: 'Outdoor',
      availability: 'Limited Release',
      yieldGPerM2: 450
    },
    cannaConnectionInfo: {
      seedBank: "Charlotte's Web Botanicals",
      climateTolerance: 'Cool',
      difficulty: 'Easy',
      thcRange: 'Low',
      cbdRange: 'High'
    },
    hytivaInfo: {
      activities: ['Studying', 'Yoga', 'Working', 'Reading'],
      terpeneDominance: 'Myrcene-dominant',
      medicalIndications: ['Anxiety', 'Epilepsy', 'Inflammation', 'PTSD']
    },
    allBudInfo: {
      avgPricePerGram: 9.00,
      dispensaryStates: ['CO', 'CA', 'FL', 'NY', 'TX', 'NC'],
      retailStatus: 'Special Order',
      thcMax: 0.3
    }
  },
  {
    id: 'strain-harlequin',
    name: "Harlequin",
    type: 'Type II (Mixed Ratio)',
    thc: 5.4,
    cbd: 10.2,
    cbg: 0.45,
    cbn: 0.02,
    terpenes: { myrcene: 0.74, limonene: 0.15, caryophyllene: 0.32, pinene: 0.55, linalool: 0.10 },
    classification: 'Sativa-dominant Hybrid',
    lineage: ['Colombian Gold', 'Thai Landrace', 'Swiss Landrace'],
    origin: 'A highly reliable mixed-ratio cultivar. It consistently produces a 1:2 or 2:3 ratio of THC to CBD, providing pain relief and muscle relaxation without intense intoxication.',
    landraceBackground: 'A complex combination of Colombian Gold sativa, Swiss/Nepali highland landrace, and Thai landrace genetics.',
    leaflyInfo: {
      effects: ['Focused', 'Relaxed', 'Happy', 'Uplifted', 'Calm'],
      flavors: ['Mango', 'Sweet', 'Earthy'],
      rating: 4.4,
      reviewsCount: 2210,
      popularReview: "My favorite daytime smoke for pain management. The pain in my back disappears, but I remain 100% focused and sharp at work."
    },
    seedFinderInfo: {
      breeder: "Southern Oregon Seeds",
      floweringTimeDays: 60,
      heightCm: 110,
      environment: 'Multi-environment',
      availability: 'Highly Available',
      yieldGPerM2: 520
    },
    cannaConnectionInfo: {
      seedBank: "Royal Queen Seeds",
      climateTolerance: 'Temperate',
      difficulty: 'Easy',
      thcRange: 'Medium',
      cbdRange: 'Medium'
    },
    hytivaInfo: {
      activities: ['Yoga', 'Socializing', 'Hiking', 'Working'],
      terpeneDominance: 'Myrcene-dominant',
      medicalIndications: ['Chronic Pain', 'Anxiety', 'Depression', 'Inflammation']
    },
    allBudInfo: {
      avgPricePerGram: 11.00,
      dispensaryStates: ['OR', 'WA', 'CO', 'CA', 'MA', 'CO'],
      retailStatus: 'In Stock',
      thcMax: 6.5
    }
  },
  {
    id: 'strain-gdp',
    name: "Granddaddy Purple (GDP)",
    type: 'Type I (THC Dominant)',
    thc: 19.5,
    cbd: 0.12,
    cbg: 0.58,
    cbn: 0.18,
    terpenes: { myrcene: 0.85, limonene: 0.10, caryophyllene: 0.28, pinene: 0.08, linalool: 0.64 },
    classification: 'Indica',
    lineage: ['Mendo Purps', 'Skunk', 'Afghanistan Indica'],
    origin: 'Introduced in 2003 by Ken Estes. GDP is a classic West Coast Indica famous for its deep purple foliage, dense flower structure, and heavy grape candy scent.',
    landraceBackground: 'Pure Afghani landrace indica varieties backcrossed with early skunk and Purple Urkle lines.',
    leaflyInfo: {
      effects: ['Sleepy', 'Relaxed', 'Hungry', 'Happy', 'Euphoric'],
      flavors: ['Grape', 'Berry', 'Sweet'],
      rating: 4.4,
      reviewsCount: 11390,
      popularReview: "Taste exactly like grape cough syrup or sweet berries. Outstanding bedtime helper, it melts stress and cures severe insomnia instantly."
    },
    seedFinderInfo: {
      breeder: "Ken Estes Genetics",
      floweringTimeDays: 56,
      heightCm: 90,
      environment: 'Indoor',
      availability: 'Highly Available',
      yieldGPerM2: 450
    },
    cannaConnectionInfo: {
      seedBank: "Granddaddy Purple Seeds",
      climateTolerance: 'Temperate',
      difficulty: 'Medium',
      thcRange: 'High',
      cbdRange: 'None'
    },
    hytivaInfo: {
      activities: ['Sleeping', 'Watching Movies', 'Listening to Music', 'Eating'],
      terpeneDominance: 'Linalool-dominant',
      medicalIndications: ['Insomnia', 'Appetite Loss', 'Muscle Spasms', 'Chronic Pain']
    },
    allBudInfo: {
      avgPricePerGram: 12.50,
      dispensaryStates: ['CA', 'NV', 'OR', 'CO', 'MI', 'FL', 'AZ'],
      retailStatus: 'In Stock',
      thcMax: 23.0
    }
  },
  {
    id: 'strain-white-cbg',
    name: "White CBG",
    type: 'Type IV (CBG Dominant)',
    thc: 0.08,
    cbd: 0.15,
    cbg: 15.2,
    cbn: 0.01,
    terpenes: { myrcene: 0.12, limonene: 0.32, caryophyllene: 0.24, pinene: 0.52, linalool: 0.05 },
    classification: 'Phytochemical Specialty Cultivar',
    lineage: ['Santhica', 'Oregon CBG Clone'],
    origin: 'Developed by Oregon CBD. Bred specifically to deactivate the THC and CBD synthase genes, resulting in high accumulations of the precursor CBG molecule.',
    landraceBackground: 'Derived from unique French fiber hemp (Santhica) showing CBG accumulation crossed with commercial resin lines.',
    leaflyInfo: {
      effects: ['Focused', 'Calm', 'Relaxed', 'Uplifted'],
      flavors: ['Pine', 'Woody', 'Earthy'],
      rating: 4.1,
      reviewsCount: 450,
      popularReview: "A unique experience. Absolutely zero high but high-grade anti-inflammatory and cognitive calming benefits. Great for gut health."
    },
    seedFinderInfo: {
      breeder: "Oregon CBD",
      floweringTimeDays: 52,
      heightCm: 110,
      environment: 'Multi-environment',
      availability: 'Limited Release',
      yieldGPerM2: 480
    },
    cannaConnectionInfo: {
      seedBank: "Oregon CBD Seeds",
      climateTolerance: 'Robust',
      difficulty: 'Easy',
      thcRange: 'Low',
      cbdRange: 'None'
    },
    hytivaInfo: {
      activities: ['Studying', 'Working', 'Reading', 'Writing'],
      terpeneDominance: 'Pinene-dominant',
      medicalIndications: ['Gut Inflammation', 'Glaucoma', 'Anxiety', 'Muscle Spasms']
    },
    allBudInfo: {
      avgPricePerGram: 8.50,
      dispensaryStates: ['OR', 'CO', 'CA', 'WA', 'ME'],
      retailStatus: 'Rare',
      thcMax: 0.1
    }
  },
  {
    id: 'strain-og-kush',
    name: "OG Kush",
    type: 'Type I (THC Dominant)',
    thc: 20.2,
    cbd: 0.18,
    cbg: 0.95,
    cbn: 0.12,
    terpenes: { myrcene: 0.72, limonene: 0.44, caryophyllene: 0.52, pinene: 0.15, linalool: 0.18 },
    classification: 'Hybrid',
    lineage: ['Hindu Kush', 'Chemdawg'],
    origin: 'The genetic backbone of West Coast strains. Created in Florida in the early 90s, this cultivar is famous for its damp woody, pine-citrus aroma and high potency stone.',
    landraceBackground: 'Direct pure Hindu Kush landrace indica combined with the elusive early Chemdawg clone.',
    leaflyInfo: {
      effects: ['Hungry', 'Happy', 'Relaxed', 'Euphoric', 'Uplifted'],
      flavors: ['Pine', 'Woody', 'Lemon'],
      rating: 4.4,
      reviewsCount: 12100,
      popularReview: "Classic lemon-pine-gas fuel aroma. Heavy head sizzle followed by deep full-body physical ease. Legendary for a reason."
    },
    seedFinderInfo: {
      breeder: "Imperial Seeds",
      floweringTimeDays: 58,
      heightCm: 100,
      environment: 'Indoor',
      availability: 'Highly Available',
      yieldGPerM2: 480
    },
    cannaConnectionInfo: {
      seedBank: "Dinafem Seeds",
      climateTolerance: 'Temperate',
      difficulty: 'Medium',
      thcRange: 'High',
      cbdRange: 'None'
    },
    hytivaInfo: {
      activities: ['Socializing', 'Watching Movies', 'Listening to Music', 'Eating'],
      terpeneDominance: 'Myrcene-dominant',
      medicalIndications: ['Anxiety', 'Chronic Pain', 'Stress', 'Appetite Loss']
    },
    allBudInfo: {
      avgPricePerGram: 11.50,
      dispensaryStates: ['CA', 'CO', 'NV', 'OR', 'WA', 'AZ', 'FL', 'MA'],
      retailStatus: 'In Stock',
      thcMax: 24.5
    }
  },
  {
    id: 'strain-jack-herer',
    name: "Jack Herer",
    type: 'Type I (THC Dominant)',
    thc: 20.5,
    cbd: 0.08,
    cbg: 1.15,
    cbn: 0.04,
    terpenes: { myrcene: 0.35, limonene: 0.18, caryophyllene: 0.42, pinene: 0.78, linalool: 0.12 },
    classification: 'Sativa-dominant Hybrid',
    lineage: ['Haze', 'Northern Lights #5', 'Shiva Skunk'],
    origin: 'Bred in the Netherlands by Sensi Seeds. Named in honor of the renowned cannabis activist and author of "The Emperor Wears No Clothes". Highly energetic and creative.',
    landraceBackground: 'Thai, Indian, and Mexican landrace sativas combined with pre-stabilized Afghani indica varieties.',
    leaflyInfo: {
      effects: ['Creative', 'Focused', 'Energetic', 'Uplifted', 'Happy'],
      flavors: ['Pine', 'Spicy', 'Woody'],
      rating: 4.4,
      reviewsCount: 9600,
      popularReview: "Smells like a walk in a damp evergreen forest. Uplifting, highly energetic high. Excellent daytime smoke for artists, writers, and coders."
    },
    seedFinderInfo: {
      breeder: "Sensi Seeds",
      floweringTimeDays: 70,
      heightCm: 150,
      environment: 'Multi-environment',
      availability: 'Highly Available',
      yieldGPerM2: 550
    },
    cannaConnectionInfo: {
      seedBank: "Sensi Seeds",
      climateTolerance: 'Warm',
      difficulty: 'Medium',
      thcRange: 'High',
      cbdRange: 'None'
    },
    hytivaInfo: {
      activities: ['Writing', 'Painting', 'Hiking', 'Socializing'],
      terpeneDominance: 'Pinene-dominant',
      medicalIndications: ['ADHD', 'Fatigue', 'Stress', 'Depression']
    },
    allBudInfo: {
      avgPricePerGram: 11.50,
      dispensaryStates: ['CO', 'CA', 'OR', 'WA', 'AZ', 'MI', 'MA'],
      retailStatus: 'In Stock',
      thcMax: 24.0
    }
  },
  {
    id: 'strain-northern-lights',
    name: "Northern Lights",
    type: 'Type I (THC Dominant)',
    thc: 17.2,
    cbd: 0.10,
    cbg: 0.42,
    cbn: 0.12,
    terpenes: { myrcene: 0.98, limonene: 0.05, caryophyllene: 0.22, pinene: 0.15, linalool: 0.18 },
    classification: 'Indica',
    lineage: ['Afghani Landrace', 'Thai Sativa'],
    origin: 'An absolute benchmark Indica. First grown near Seattle, WA, and then commercialized by Sensi Seeds in Holland. Highly resilient, sweet, and tranquil.',
    landraceBackground: 'Pure ancestral Hindu Kush mountain landrace indica with trace Thai sativa lineage.',
    leaflyInfo: {
      effects: ['Sleepy', 'Relaxed', 'Happy', 'Hungry', 'Calm'],
      flavors: ['Sweet', 'Spicy', 'Pine'],
      rating: 4.3,
      reviewsCount: 6520,
      popularReview: "Pure tranquilizing weight. Excellent muscle melt and absolute peace of mind. Highly recommended for nighttime recovery."
    },
    seedFinderInfo: {
      breeder: "Sensi Seeds",
      floweringTimeDays: 50,
      heightCm: 80,
      environment: 'Indoor',
      availability: 'Highly Available',
      yieldGPerM2: 450
    },
    cannaConnectionInfo: {
      seedBank: "Sensi Seeds",
      climateTolerance: 'Cool',
      difficulty: 'Easy',
      thcRange: 'Medium',
      cbdRange: 'None'
    },
    hytivaInfo: {
      activities: ['Sleeping', 'Watching Movies', 'Listening to Music', 'Meditating'],
      terpeneDominance: 'Myrcene-dominant',
      medicalIndications: ['Insomnia', 'Muscle Spasms', 'Anxiety', 'Chronic Pain']
    },
    allBudInfo: {
      avgPricePerGram: 10.00,
      dispensaryStates: ['WA', 'OR', 'CO', 'CA', 'NV', 'MI'],
      retailStatus: 'In Stock',
      thcMax: 19.5
    }
  }
];
