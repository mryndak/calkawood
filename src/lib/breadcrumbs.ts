export interface BreadcrumbItem {
  name: string;
  href: string;
}

export function buildBreadcrumbList(items: BreadcrumbItem[], site: URL) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.href, site).href,
    })),
  };
}

/**
 * Dokłada BreadcrumbList do structuredData strony, niezależnie od tego, czy
 * strona nie ma jeszcze żadnych danych, ma pojedynczy typ (np. Service), czy
 * już korzysta z @graph (np. FAQPage + Service) — patrz src/pages/uslugi/[category].astro.
 */
export function withBreadcrumbs(structuredData: object | undefined, breadcrumbList: object): object {
  if (!structuredData) {
    return { '@context': 'https://schema.org', ...breadcrumbList };
  }

  const data = structuredData as Record<string, unknown>;

  if (Array.isArray(data['@graph'])) {
    return { ...data, '@graph': [...data['@graph'], breadcrumbList] };
  }

  const { '@context': context = 'https://schema.org', ...rest } = data;
  return { '@context': context, '@graph': [rest, breadcrumbList] };
}
