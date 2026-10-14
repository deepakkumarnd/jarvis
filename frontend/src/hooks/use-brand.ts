import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/hooks/use-session'
import { settingsApi } from '@/lib/api'
import { brandFaviconHref, FALLBACK_BRAND_NAME } from '@/lib/brand'

/**
 * The brand to display: the name and tagline from the settings record when signed in,
 * otherwise the fallback. Settings are only requested once signed in.
 */
export function useBrand() {
  const { data: session } = useSession()
  const signedIn = session?.signedIn === true
  // Same query key as useSettings, so saving settings updates the brand everywhere at once
  const { data: settings, isPending } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: Infinity, enabled: signedIn })

  return {
    brandName: settings?.brand_name || FALLBACK_BRAND_NAME,
    tagline: settings?.tagline ?? '',
    /** True while signed in and the settings record is still loading */
    loading: signedIn && isPending,
  }
}

/** Keeps the tab title, meta description and favicon in sync with the brand. Render once at the root. */
export function BrandDocumentHead() {
  const { brandName, tagline, loading } = useBrand()

  useEffect(() => {
    if (loading) return
    document.title = brandName
    document.querySelector('meta[name="description"]')?.setAttribute('content', [brandName, tagline].filter(Boolean).join(' — '))
    document.querySelector('link[rel="icon"]')?.setAttribute('href', brandFaviconHref(brandName))
  }, [brandName, tagline, loading])

  return null
}
