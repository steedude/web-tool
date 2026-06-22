import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const publishableKey = config.public.supabasePublishableKey

  const supabase = url && publishableKey
    ? createClient(url, publishableKey)
    : null

  return {
    provide: {
      supabase,
    },
  }
})
