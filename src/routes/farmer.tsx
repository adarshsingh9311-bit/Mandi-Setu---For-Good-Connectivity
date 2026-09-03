import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/farmer")({
  head: () => ({
    meta: [
      { title: "Farmer Portal — KisanSetu Procurement Coordination" },
      {
        name: "description",
        content:
          "Live mandi queue, waiting-time prediction, smart slots and disruption recovery for farmers. SIH 2026 prototype.",
      },
      { property: "og:title", content: "Farmer Portal — KisanSetu" },
      {
        property: "og:description",
        content:
          "Live queue visibility, smart procurement slots and alternative mandi recommendations.",
      },
    ],
  }),
  component: FarmerLayout,
});

function FarmerLayout() {
  return (
    <>
      <Outlet />
    </>
  );
}
