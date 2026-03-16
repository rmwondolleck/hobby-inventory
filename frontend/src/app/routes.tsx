import { createBrowserRouter } from "react-router";
import { AppShell } from "./components/app-shell";
import { Dashboard } from "./pages/dashboard";
import { Intake } from "./pages/intake";
import { PartsList } from "./pages/parts-list";
import { PartDetail } from "./pages/part-detail";
import { ImportExport } from "./pages/import-export";
import { ProjectsList } from "./pages/projects-list";
import { ProjectDetail } from "./pages/project-detail";
import { LotsList } from "./pages/lots-list";
import { LotDetail } from "./pages/lot-detail";
import { LocationsList } from "./pages/locations-list";
import { LocationDetail } from "./pages/location-detail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "intake",
        Component: Intake,
      },
      {
        path: "parts",
        Component: PartsList,
      },
      {
        path: "parts/:id",
        Component: PartDetail,
      },
      {
        path: "import",
        Component: ImportExport,
      },
      {
        path: "projects",
        Component: ProjectsList,
      },
      {
        path: "projects/:id",
        Component: ProjectDetail,
      },
      {
        path: "lots",
        Component: LotsList,
      },
      {
        path: "lots/:id",
        Component: LotDetail,
      },
      {
        path: "locations",
        Component: LocationsList,
      },
      {
        path: "locations/:id",
        Component: LocationDetail,
      },
      // Placeholder routes for other pages
      {
        path: "print/labels",
        Component: () => (
          <div className="p-8">
            <h1 className="text-3xl font-semibold mb-4">Print Labels</h1>
            <p className="text-muted-foreground">Generate location and lot labels</p>
          </div>
        ),
      },
      {
        path: "*",
        Component: () => (
          <div className="p-8">
            <h1 className="text-3xl font-semibold mb-4">404</h1>
            <p className="text-muted-foreground">Page not found</p>
          </div>
        ),
      },
    ],
  },
]);