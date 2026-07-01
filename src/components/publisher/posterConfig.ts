
export interface PosterConfig {
  id: string;
  title: string;
  image: string;
  fallbackUrl: string;
  slogan: string;
  theme: string;
  color: string;
}

export const PROPAGANDA_POSTERS: PosterConfig[] = [
  {
    id: 'poster-1',
    title: 'Purity Guaranteed (Reactor Column)',
    image: '/src/assets/images/refinery_propaganda_1782837389239.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    slogan: 'THE MACHINE OPTIMIZES. THE PRODUCT REVEALS.',
    theme: 'Vaporwave Minimalist Grid',
    color: 'border-emerald-500 text-emerald-400'
  },
  {
    id: 'poster-2',
    title: 'Thermodynamic Molecular Blueprint',
    image: '/src/assets/images/molecular_blueprint_1782837403709.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
    slogan: 'DETERMINISTIC SIMULATION. PROVEN VERACITY.',
    theme: 'Sleek Neon Tech',
    color: 'border-cyan-500 text-cyan-400'
  },
  {
    id: 'poster-3',
    title: 'Cyber-Botanical Cultivation Chamber',
    image: '/src/assets/images/cybernetic_crop_1782837416012.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80',
    slogan: 'AUTONOMY. VERIFICATION. EXTREME YIELD.',
    theme: 'Dark Emerald Grow',
    color: 'border-purple-500 text-purple-400'
  }
];
