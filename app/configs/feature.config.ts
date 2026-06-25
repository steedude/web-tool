type Translate = (key: string) => string

const HOME_FEATURE_BASE = [
  {
    accent: 'bg-coral',
    to: '/draw',
  },
  {
    accent: 'bg-sky',
    to: '/drop',
  },
  {
    accent: 'bg-violet',
    to: '/links',
  },
] as const

export function createHomeFeatures(t: Translate) {
  return [
    {
      ...HOME_FEATURE_BASE[0],
      badge: t('features.draw.badge'),
      description: t('features.draw.description'),
      index: t('features.draw.index'),
      title: t('features.draw.title'),
    },
    {
      ...HOME_FEATURE_BASE[1],
      badge: t('features.drop.badge'),
      description: t('features.drop.description'),
      index: t('features.drop.index'),
      title: t('features.drop.title'),
    },
    {
      ...HOME_FEATURE_BASE[2],
      badge: t('features.links.badge'),
      description: t('features.links.description'),
      index: t('features.links.index'),
      title: t('features.links.title'),
    },
  ]
}
