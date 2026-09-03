import { createFileRoute } from "@tanstack/react-router";
import { PresentationHome } from "@/components/PresentationHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MandiSetu — Farmer & Government Portal | SIH" },
      {
        name: "description",
        content:
          "One connected website for farmer slot booking, live queues, and government mandi operations.",
      },
    ],
  }),
  component: PresentationHome,
});
