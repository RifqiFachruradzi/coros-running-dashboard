import type { Metadata } from "next";
import { readRecommendation, readRuns } from "@/lib/data-store";
import { summarize } from "@/lib/aggregate";
import { isStorageConfigured } from "@/lib/token-store";
import { loadRoutes } from "@/lib/user-store";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RouteBuilder } from "@/components/RouteBuilder";

export const metadata: Metadata = { title: "Rute — Dashboard Lari" };
export const revalidate = 0;

export default async function RoutesPage() {
  const [runs, routes, { recommendation }] = await Promise.all([readRuns(), loadRoutes(), readRecommendation()]);
  const { avgPace } = summarize(runs, 30);
  const tomorrow = recommendation?.tomorrow;

  return (
    <AppShell active="/rute">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-8 lg:py-1.5">
        <PageHeader
          eyebrow="Rute"
          title="Buat rute & dapatkan rekomendasi"
          description={
            tomorrow?.distanceKm
              ? `Latihan besok dari Coach: ${tomorrow.title}, ${tomorrow.distanceKm} km. Rute tersimpan yang paling pas muncul di panel rekomendasi.`
              : "Gambar rute favoritmu, lalu cari rute yang paling pas untuk jarak latihan tertentu."
          }
        />
        <RouteBuilder
          routes={routes}
          tomorrowKm={tomorrow?.distanceKm ?? null}
          paceSecPerKm={avgPace}
          storageReady={isStorageConfigured()}
        />
      </div>
    </AppShell>
  );
}
