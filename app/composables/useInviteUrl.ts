import type { RouteLocationRaw } from 'vue-router'

export function useInviteUrl(route: MaybeRefOrGetter<RouteLocationRaw | null>) {
  const localePath = useLocalePath()
  const origin = useRequestURL().origin

  return computed(() => {
    const destination = toValue(route)
    return destination ? new URL(localePath(destination), origin).href : ''
  })
}
