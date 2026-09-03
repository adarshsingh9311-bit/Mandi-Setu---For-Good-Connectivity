import { createFileRoute } from "@tanstack/react-router";
import { Check, Globe2, History, Languages, MapPin, Pencil, Phone, Tractor } from "lucide-react";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDemo } from "@/lib/demoStore";
import { languages, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/farmer/profile")({
  head: () => ({
    meta: [
      { title: "Farmer Profile — KisanSetu" },
      {
        name: "description",
        content: "Manage your KisanSetu farmer profile, language and procurement history.",
      },
      { property: "og:title", content: "Farmer Profile — KisanSetu" },
      {
        property: "og:description",
        content: "Manage your KisanSetu farmer profile, language and procurement history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});
function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { farmer: currentFarmer, farmerLoading, farmerError, reloadFarmer } = useDemo();
  if (farmerLoading || farmerError)
    return (
      <FarmerShell title={t("profile")} back="/farmer">
        <p role={farmerError ? "alert" : "status"}>{farmerError || "Loading your profile…"}</p>
        {farmerError && <Button onClick={() => void reloadFarmer()}>Retry</Button>}
      </FarmerShell>
    );
  return (
    <FarmerShell title={t("profile")} back="/farmer">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              RK
            </span>
            <div>
              <h2 className="text-xl font-bold">{currentFarmer.name}</h2>
              <p className="text-sm text-muted-foreground">Farmer ID · {currentFarmer.id}</p>
            </div>
            <Button variant="outline" size="icon" className="ml-auto" aria-label="Edit profile">
              <Pencil />
            </Button>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <Info
              icon={MapPin}
              label="Village"
              value={`${currentFarmer.village}, ${currentFarmer.district}`}
            />
            <Info icon={Phone} label="Mobile" value={currentFarmer.mobile} />
            <Info icon={Tractor} label="Transport" value={currentFarmer.transport} />
          </dl>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Languages className="size-5 text-primary" />
            <h2 className="font-bold">{t("changeLanguage")}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the language used across your farmer workspace.
          </p>
          <Select value={lang} onValueChange={(value) => setLang(value as typeof lang)}>
            <SelectTrigger className="mt-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.native} · {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <section className="mt-6" aria-labelledby="history">
        <div className="flex items-center gap-2">
          <History className="size-5 text-primary" />
          <h2 id="history" className="text-lg font-bold">
            Procurement history
          </h2>
        </div>
        <div className="mt-3 space-y-3">
          {currentFarmer.history.map((item) => (
            <Card key={item.season}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">
                    {item.crop} · {item.qty}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Globe2 className="size-3.5" />
                    {item.season} · {item.centre}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-status-normal-soft px-2.5 py-1 text-xs font-semibold text-primary">
                  <Check className="size-3" />
                  {item.status}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </FarmerShell>
  );
}
function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 text-muted-foreground" />
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="ml-auto font-semibold text-right">{value}</dd>
    </div>
  );
}
