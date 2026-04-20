import React from "react";
import { createRoot } from "react-dom/client";
import Bookmarks from "./Bookmarks.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Bookmarks />
  </React.StrictMode>
);
