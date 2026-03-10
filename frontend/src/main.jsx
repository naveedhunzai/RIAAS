import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Documents from "./pages/Documents";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Ingest from "./pages/Ingest";
import Ask from "./pages/Ask";
import Requirements from "./pages/Requirements";
import Actions from "./pages/Actions";
import Settings from "./pages/Settings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "ingest", element: <Ingest /> },
      { path: "ask", element: <Ask /> },
      { path: "requirements", element: <Requirements /> },
      { path: "actions", element: <Actions /> },
      { path: "documents", element: <Documents /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

