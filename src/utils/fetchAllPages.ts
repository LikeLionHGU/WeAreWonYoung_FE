interface Page<T> {
  items: T[]
  totalPages: number
}

export async function fetchAllPages<T>(fetchPage: (page: number) => Promise<Page<T>>) {
  const first = await fetchPage(0)
  const items = [...first.items]
  for (let page = 1; page < first.totalPages; page += 1) {
    items.push(...(await fetchPage(page)).items)
  }
  return items
}
