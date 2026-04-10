import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PartoMa Project Cohort',
    short_name: 'PartoMa',
    description: 'Data management for Antenatal Care (ANC) cohort study.',
    start_url: '/anc/activities',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#10b981',
    icons: [
      {
        src: 'https://picsum.photos/seed/partoma-clinical/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'https://picsum.photos/seed/partoma-clinical/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
  };
}
