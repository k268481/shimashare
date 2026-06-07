import { listListings } from "@/lib/repos";
import { ListingsBrowser } from "./ListingsBrowser";

export default function ListingsPage({
  searchParams,
}: {
  searchParams: { free?: string };
}) {
  const freeOnly = searchParams.free === "1";
  const listings = listListings(freeOnly ? { freeOnly: true } : undefined);
  return <ListingsBrowser listings={listings} freeOnly={freeOnly} />;
}
