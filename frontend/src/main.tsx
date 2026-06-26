import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./layouts/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Repositories from "./pages/Repositories";
import PRReview from "./pages/PRReview";
import HistoryPage from "./pages/History";
import InsightsPage from "./pages/Insights";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated Application Shell */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="repositories" element={<Repositories />} />
            <Route path="review/:prId" element={<PRReview />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="insights" element={<InsightsPage />} />
          </Route>

          {/* Redirect missing routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
