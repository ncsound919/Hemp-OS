/**
 * Public Education Service
 *
 * Generates layman-friendly content from Hemp OS data:
 * - Articles explaining strain profiles in plain English
 * - Social media threads (Twitter/X style)
 * - Educational snippets
 * - Infographic data summaries
 * - Market insights for general public
 */

import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'hemp_os.db'));

// =========================================================================
// LAYMAN STRAIN EXPLAINERS
// =========================================================================

const EFFECT_DESCRIPTIONS: Record<string, string> = {
  Relaxed: 'a calming full-body sensation that melts tension away',
  Happy: 'a gentle mood lift that puts a smile on your face',
  Euphoric: 'a wave of blissful happiness that radiates through you',
  Creative: 'a spark of imagination that gets your ideas flowing',
  Uplifted: 'a soaring mental energy that lifts your spirits',
  Sleepy: 'a heavy, cozy drowsiness perfect for bedtime',
  Energetic: 'a burst of motivation to get up and do things',
  Focused: 'a sharp mental clarity that helps you concentrate',
  Hungry: 'a case of the munchies that makes everything taste amazing',
  Talkative: 'a sociable buzz that gets conversations flowing',
  Tingly: 'a pleasant buzzing sensation throughout the body',
  Giggly: 'uncontrollable laughter at just about anything',
};

const TERPENE_DESCRIPTIONS: Record<string, string> = {
  myrcene: 'myrcene — the "couch-lock" terpene found in mangoes and hops',
  limonene: 'limonene — the citrusy terpene that boosts mood, also found in lemons',
  caryophyllene: 'caryophyllene — the spicy terpene in black pepper that interacts with pain receptors',
  pinene: 'pinene — the pine-scented terpene that promotes alertness, found in pine needles',
  linalool: 'linalool — the floral terpene in lavender known for its calming properties',
};

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface StrainArticle {
  title: string;
  subtitle: string;
  summary: string;
  sections: { heading: string; body: string; funFact?: string }[];
  keyTakeaways: string[];
  readingTimeMinutes: number;
}

export interface SocialThread {
  platform: 'twitter' | 'linkedin' | 'instagram';
  posts: { text: string; hashtags?: string[]; emoji?: string }[];
  totalLength: number;
}

export interface InfographicData {
  title: string;
  headline: string;
  stats: { label: string; value: string; icon?: string }[];
  comparisons: { label: string; left: string; right: string }[];
  colorPalette: string[];
}

export class PublicEducationService {
  /**
   * Generate a layman-friendly article about a specific strain
   */
  generateStrainArticle(strainName: string): StrainArticle | null {
    const strain = db.prepare(`
      SELECT s.*, sr.raw_json
      FROM strains s
      LEFT JOIN source_records sr ON s.id = sr.strain_id
      WHERE s.canonical_name = ?
    `).get(strainName) as any;

    if (!strain) {return null;}

    const cannabinoids = strain.cannabinoids_json ? JSON.parse(strain.cannabinoids_json) : {};
    const effects = strain.effects_json ? JSON.parse(strain.effects_json) : [];
    const flavors = strain.flavors_json ? JSON.parse(strain.flavors_json) : [];
    const lineage = strain.lineage_json ? JSON.parse(strain.lineage_json) : [];
    const thc = cannabinoids.thc || 0;
    const cbd = cannabinoids.cbd || 0;

    // Determine strain personality
    const strainPersonality =
      thc > 20 ? 'a potent heavyweight' :
      thc > 15 ? 'a solid mid-range strain' :
      thc > 10 ? 'a moderate, approachable strain' :
      cbd > 5 ? 'a therapeutic CBD-rich strain' :
      'a mild, easygoing strain';

    const typeDesc = strain.type === 'indica' ? 'Indica (body-focused, relaxing)' :
      strain.type === 'sativa' ? 'Sativa (mind-focused, energizing)' :
      'Hybrid (balanced mind-and-body effects)';

    // Describe lineage
    const lineageDesc = lineage.length > 0
      ? `It's bred from ${lineage.join(' and ')}, giving it a rich genetic heritage.`
      : 'Its exact lineage is a closely guarded secret among breeders.';

    // Describe effects in plain language
    const effectDescriptions = effects.slice(0, 4).map((e: string) =>
      EFFECT_DESCRIPTIONS[e] || e.toLowerCase()
    );
    const effectsText = effectDescriptions.length > 0
      ? effectDescriptions.slice(0, -1).join(', ') +
        (effectDescriptions.length > 1 ? ', and ' : '') +
        effectDescriptions.slice(-1)[0]
      : 'a unique experience that users find enjoyable';

    // Describe flavors
    const flavorsText = flavors.length > 0
      ? flavors.slice(0, 3).join(', ')
      : 'earthy and herbal';

    // Strength description
    const strengthLevel = thc >= 25 ? 'extremely potent' :
      thc >= 20 ? 'very potent' :
      thc >= 15 ? 'potent' :
      thc >= 10 ? 'moderately strong' :
      thc >= 5 ? 'mild' : 'very mild';

    const sections = [
      {
        heading: 'What is this strain?',
        body: `${strain.canonical_name} is ${strainPersonality} from the ${typeDesc} family. ${lineageDesc} With THC levels around ${thc}% and CBD at ${cbd}%, it offers ${effectsText}.`,
        funFact: lineage.length > 0
          ? `Fun fact: ${lineage[0]} is one of its parent strains, contributing to its unique character.`
          : undefined,
      },
      {
        heading: 'What does it feel like?',
        body: `Users describe ${strain.canonical_name} as providing ${effectsText}. ` +
          `It tastes ${flavorsText} with a distinctive aroma profile. ${ 
          thc > 20
            ? `This is ${strengthLevel} — perfect for experienced users but might be overwhelming for beginners. Start low and go slow!`
            : `This strain is ${strengthLevel}, making it suitable for a wide range of users.`}`,
      },
      {
        heading: 'How does it compare?',
        body: thc > 20
          ? `With ${thc}% THC, ${strain.canonical_name} ranks among the more potent strains available. It's comparable to other heavy hitters in its class. The ${cbd > 1 ? `${cbd}% CBD content adds a balancing therapeutic effect,` : 'low CBD content means the experience is driven primarily by THC.'}`
          : `At ${thc}% THC, this strain is ${strengthLevel} compared to the average. ${cbd > 2 ? `The notable CBD content (${cbd}%) makes it appealing for those seeking therapeutic benefits without intense psychoactivity.` : 'Its balanced profile makes it a versatile choice for various occasions.'}`,
      },
    ];

    // Add terpene section if available
    const rawData = strain.raw_json ? JSON.parse(strain.raw_json) : {};
    const terpenes = rawData.terpenes || {};
    const terpeneKeys = Object.keys(terpenes).filter(k => terpenes[k] > 0);
    if (terpeneKeys.length > 0) {
      const dominantTerpene = terpeneKeys.reduce((a, b) => terpenes[a] > terpenes[b] ? a : b);
      const terpDesc = TERPENE_DESCRIPTIONS[dominantTerpene] || dominantTerpene;
      const allTerps = terpeneKeys.map(t => TERPENE_DESCRIPTIONS[t] || t).join(', ');
      sections.push({
        heading: 'The Terpene Story',
        body: `The aroma and effects of ${strain.canonical_name} are shaped by its terpenes — aromatic compounds found in all plants. The dominant terpene is ${terpDesc}. Together, this strain's terpene profile includes ${allTerps}, creating its signature character.`,
        funFact: 'Terpenes work together with cannabinoids in what scientists call the "entourage effect" — the compounds enhance each other\'s effects when consumed together.',
      });
    }

    return {
      title: `${strain.canonical_name}: ${thc > 20 ? 'A Potent Powerhouse' : thc > 10 ? 'A Balanced Beauty' : 'A Gentle Giant'} of the Cannabis World`,
      subtitle: `Everything you need to know about ${strain.canonical_name} — effects, flavors, lineage, and what makes it special`,
      summary: `${strain.canonical_name} is a ${typeDesc.split(' (')[0].toLowerCase()} cannabis strain with ${thc}% THC and ${cbd}% CBD. Users describe the experience as ${effectsText}. ${strain.description || ''}`,
      sections,
      keyTakeaways: [
        `${strain.canonical_name} contains approximately ${thc}% THC${cbd > 0 ? ` and ${cbd}% CBD` : ''}`,
        `It belongs to the ${typeDesc}`,
        `Users report feeling ${effects.slice(0, 3).join(', ').toLowerCase()}`,
        `The flavor profile features ${flavorsText}`,
        terpeneKeys.length > 0 ? `Key terpenes include ${terpeneKeys.join(', ')}` : '',
      ].filter(Boolean),
      readingTimeMinutes: Math.ceil(sections.length * 1.5),
    };
  }

  /**
   * Generate a social media thread about a strain or topic
   */
  generateSocialThread(topic: string): SocialThread {
    let posts: { text: string; hashtags?: string[]; emoji?: string }[] = [];

    if (topic === 'strain_spotlight' || topic === 'random') {
      // Pick a random strain with good data
      const strain = db.prepare(`
        SELECT canonical_name, type,
          json_extract(cannabinoids_json, '$.thc') as thc,
          json_extract(cannabinoids_json, '$.cbd') as cbd
        FROM strains
        WHERE CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) > 0
        ORDER BY RANDOM() LIMIT 1
      `).get() as any;

      if (strain) {
        posts = [
          { text: `🧵 Let's talk about ${strain.canonical_name} — a ${strain.type} strain with ~${parseFloat(strain.thc || '0').toFixed(1)}% THC!\n\nA thread 🧵👇`, hashtags: ['CannabisEducation', 'StrainSpotlight'] },
          { text: `📊 ${strain.canonical_name} contains:\n💚 THC: ${parseFloat(strain.thc || '0').toFixed(1)}%\n💛 CBD: ${parseFloat(strain.cbd || '0').toFixed(1)}%\n\nThis ${strain.type === 'indica' ? 'body-focused indica' : strain.type === 'sativa' ? 'mind-energizing sativa' : 'balanced hybrid'} offers a unique experience.` },
          { text: `💡 Fun fact: The effects you feel from cannabis come from the "entourage effect" — cannabinoids and terpenes working together synergistically. ${strain.canonical_name} has its own unique chemical fingerprint!` },
          { text: `📝 Whether you're a curious newcomer or an experienced enthusiast, understanding what makes each strain unique helps you find what works best for YOU.\n\nKnowledge is power. 🧠💚`, hashtags: ['KnowYourStrain'] },
        ];
      }
    } else if (topic === 'science_fact') {
      const paper = db.prepare('SELECT title, abstract FROM papers WHERE abstract != "" ORDER BY RANDOM() LIMIT 1').get() as any;
      if (paper) {
        const shortAbstract = (paper.abstract || '').substring(0, 250);
        posts = [
          { text: `🔬 New research dropped!\n\n"${(paper.title || '').substring(0, 100)}"\n\nHere's what it means for you 🧵👇`, hashtags: ['CannabisScience', 'Research'] },
          { text: `📖 The gist:\n\n${shortAbstract}...\n\nThis adds to our growing understanding of the cannabis plant and its effects.` },
          { text: `💡 Why this matters: Every study brings us closer to understanding how cannabis works, helping patients get better care and consumers make informed choices.\n\nScience takes time, but every paper moves us forward. 🧪🌱`, hashtags: ['ScienceMatters'] },
        ];
      }
    }

    // Fallback
    if (posts.length === 0) {
      posts = [
        { text: `🌱 Did you know the cannabis plant produces over 100 different cannabinoids? THC and CBD are just the beginning!`, hashtags: ['CannabisEducation', 'DidYouKnow'] },
        { text: `🔬 Researchers have identified over 200 terpenes in cannabis — each contributing to the plant's aroma, flavor, and effects. That's why different strains smell and feel unique! 👃✨` },
        { text: `📊 In our database at Hemp OS, we track ${db.prepare('SELECT COUNT(*) as c FROM strains').get() as any} strains and ${db.prepare('SELECT COUNT(*) as c FROM papers').get() as any} scientific papers — all working toward better understanding of this amazing plant. 🌱💚`, hashtags: ['DataDriven', 'HempOS'] },
      ];
    }

    const totalLength = posts.reduce((sum, p) => sum + p.text.length, 0);
    return { platform: 'twitter', posts, totalLength };
  }

  /**
   * Generate infographic-ready data summary
   */
  generateInfographic(): InfographicData {
    const strainCount = (db.prepare('SELECT COUNT(*) as c FROM strains').get() as any).c;
    const paperCount = (db.prepare('SELECT COUNT(*) as c FROM papers').get() as any).c;
    const marketCount = (db.prepare('SELECT COUNT(*) as c FROM market_prices').get() as any).c;
    const topStrain = db.prepare(`
      SELECT canonical_name, CAST(json_extract(cannabinoids_json, '$.thc') AS REAL) as thc
      FROM strains ORDER BY thc DESC LIMIT 1
    `).get() as any;

    const avgPrice = db.prepare('SELECT ROUND(AVG(highq_price), 2) as avg FROM market_prices').get() as any;
    const cheapestState = db.prepare(`
      SELECT state, ROUND(AVG(highq_price), 2) as avg
      FROM market_prices GROUP BY state ORDER BY avg ASC LIMIT 1
    `).get() as any;

    const hybC = (db.prepare("SELECT COUNT(*) as c FROM strains WHERE type='hybrid'").get() as any).c;
    const satC = (db.prepare("SELECT COUNT(*) as c FROM strains WHERE type='sativa'").get() as any).c;
    const indC = (db.prepare("SELECT COUNT(*) as c FROM strains WHERE type='indica'").get() as any).c;
    const oaC = (db.prepare("SELECT COUNT(*) as c FROM papers WHERE source='openalex'").get() as any).c;
    const pmC = (db.prepare("SELECT COUNT(*) as c FROM papers WHERE source='pubmed'").get() as any).c;
    const legalPrice = (db.prepare("SELECT ROUND(AVG(mp.highq_price), 2) as v FROM market_prices mp JOIN market_states s ON LOWER(s.name)=LOWER(mp.state) WHERE s.legal_status='legal'").get() as any).v;
    const illegalPrice = (db.prepare("SELECT ROUND(AVG(mp.highq_price), 2) as v FROM market_prices mp JOIN market_states s ON LOWER(s.name)=LOWER(mp.state) WHERE s.legal_status='illegal'").get() as any).v;

    return {
      title: 'Hemp OS — Intelligence Snapshot',
      headline: `${strainCount} Cannabis Strains • ${paperCount} Research Papers • ${marketCount} Market Data Points`,
      stats: [
        { label: 'Strains Tracked', value: strainCount.toLocaleString(), icon: '🌿' },
        { label: 'Scientific Papers', value: paperCount.toLocaleString(), icon: '📄' },
        { label: 'Market Records', value: marketCount.toLocaleString(), icon: '📊' },
        { label: 'Highest THC Strain', value: `${topStrain?.thc || '?'}%`, icon: '⚡' },
        { label: `Avg High-Quality Price`, value: `$${avgPrice?.avg || '?'}/oz`, icon: '💰' },
        { label: `Cheapest State`, value: cheapestState?.state || '?', icon: '🗺️' },
      ],
      comparisons: [
        { label: 'Strain Types', left: `Hybrid: ${hybC}`, right: `Sativa: ${satC} | Indica: ${indC}` },
        { label: 'Paper Sources', left: `OpenAlex: ${oaC}`, right: `PubMed: ${pmC}` },
        { label: 'Legal Status Impact', left: `Legal states: $${legalPrice}/oz`, right: `Illegal states: $${illegalPrice}/oz` },
      ],
      colorPalette: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'],
    };
  }

  /**
   * Generate an educational "Did You Know" snippet
   */
  generateDidYouKnow(): { fact: string; category: string; source?: string } {
    const facts = [
      { fact: 'The cannabis plant produces over 100 different cannabinoids — but THC and CBD are just the two most abundant ones.', category: 'Chemistry', source: 'ElSohly & Slade, 2005' },
      { fact: 'Terpenes aren\'t unique to cannabis — they\'re found in all plants. Myrcene (also in mangoes) and limonene (also in lemons) are just two examples.', category: 'Botany', source: 'Russo, 2011' },
      { fact: 'The "entourage effect" suggests cannabinoids and terpenes work better together than alone — like a symphony orchestra vs a single instrument.', category: 'Pharmacology', source: 'Russo, 2019' },
      { fact: 'Hemp and marijuana are the same species — Cannabis sativa L. — but hemp is defined by law as containing less than 0.3% THC.', category: 'Botany', source: 'US Farm Bill, 2018' },
      { fact: 'THC was first isolated in its pure form in 1942 by American chemist Roger Adams, but its structure wasn\'t fully determined until 1964 by Israeli chemist Raphael Mechoulam.', category: 'History', source: 'Mechoulam & Gaoni, 1964' },
      { fact: 'The human body produces its own cannabinoids — called endocannabinoids — which regulate mood, appetite, pain sensation, and memory.', category: 'Biology', source: 'Pertwee, 2006' },
      { fact: 'CBD doesn\'t produce a "high" because it has very low affinity for the CB1 receptor in the brain — unlike THC which binds strongly.', category: 'Pharmacology', source: 'Thomas et al., 2007' },
      { fact: 'Cannabis has been used by humans for at least 5,000 years — the first recorded use was in ancient China for medicinal purposes.', category: 'History', source: 'Li, 1974' },
      { fact: 'The CBG cannabinoid is often called the "mother cannabinoid" because other cannabinoids like THC and CBD are synthesized from CBG in the plant.', category: 'Chemistry', source: 'de Meijer et al., 2003' },
      { fact: 'There are two main subspecies of cannabis: Cannabis sativa (tall, narrow leaves) and Cannabis indica (short, broad leaves), plus a third called Cannabis ruderalis.', category: 'Botany', source: 'McPartland, 2018' },
      { fact: 'The record for the highest THC level ever recorded in a cannabis strain is over 37% — more than triple the average from the 1990s.', category: 'Data', source: 'Potency Monitoring Program, DEA' },
      { fact: 'Cannabis was one of the first plants to be sequenced genetically — its genome was published in 2011.', category: 'Science', source: 'van Bakel et al., 2011' },
      { fact: 'Not all cannabis strains produce the same effects for everyone — individual genetics, metabolism, and tolerance all play a huge role.', category: 'Health', source: 'Huestis, 2007' },
      { fact: 'The illegal status of cannabis in many regions creates price premiums — in illegal US states, high-quality cannabis costs an average of 30-40% more than in legal states.', category: 'Economics', source: 'Hemp OS Market Data' },
      { fact: 'Hemp fibers were used to make rope and sails for ships for centuries — the word "canvas" comes from "cannabis."', category: 'History', source: 'Small, 2015' },
    ];

    return pickRandom(facts);
  }
}

export const publicEducation = new PublicEducationService();
