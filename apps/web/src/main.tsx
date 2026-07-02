import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
} from "react-router-dom";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { App } from "./App";
import { UpdateNotification } from "@/components/feature/UpdateNotification";
import { ExperimentsLayout } from "./routes/experiments/ExperimentsLayout";
import { SurveyPage } from "./routes/experiments/SurveyPage";
import { Test1Page } from "./routes/experiments/Test1Page";
import { PracticePage } from "./routes/experiments/PracticePage";
import { Test2Page } from "./routes/experiments/Test2Page";
import { PostSurveyPage } from "./routes/experiments/PostSurveyPage";
import { CompletePage } from "./routes/experiments/CompletePage";
import { IneligiblePage } from "./routes/experiments/IneligiblePage";
import { InvalidPage } from "./routes/experiments/InvalidPage";

function RootLayout() {
  return (
    <>
      <Outlet />
      <UpdateNotification />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <App /> },
      {
        path: "/experiments",
        element: <ExperimentsLayout />,
        children: [
          { index: true, element: <SurveyPage /> },
          { path: "test1", element: <Test1Page /> },
          { path: "practice", element: <PracticePage /> },
          { path: "test2", element: <Test2Page /> },
          { path: "post-survey", element: <PostSurveyPage /> },
          { path: "complete", element: <CompletePage /> },
          { path: "ineligible", element: <IneligiblePage /> },
          { path: "invalid", element: <InvalidPage /> },
        ],
      },
    ],
  },
]);

const container = document.getElementById("root");
if (!container) throw new Error("#root not found");

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
