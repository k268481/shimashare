import Link from "next/link";
import { listShops } from "@/lib/repos";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

export default async function ShopsPage() {
  const shops = await listShops();

  return (
    <div className="container-app space-y-5 py-6">
      <header>
        <h1 className="font-display text-3xl">島内の店舗</h1>
        <p className="mt-1 text-text-secondary">
          欲しいものがないときは、お店に取り寄せをお願いできます。
        </p>
      </header>

      <ul className="space-y-3">
        {shops.map((s) => (
          <li key={s.id}>
            <Link href={`/shops/${s.id}`}>
              <Card hoverable>
                <CardBody className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle as="h2" className="text-xl">
                      {s.name}
                    </CardTitle>
                    <Chip variant={s.responseChannel === "line" ? "active" : "default"}>
                      {s.responseChannel === "line" ? "LINE対応" : "電話のみ"}
                    </Chip>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {s.location}・{s.openingHours}
                  </p>
                  <p className="line-clamp-2 text-sm">{s.itemsDescription}</p>
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
